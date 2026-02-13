import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { getApiUrl } from '@/lib/query-client';
import { macrostratService, StratigraphicColumn } from './macrostratService';
import { locationService } from './locationService';
import { usgsService } from './usgsService';
import { offlineCacheService, CachedFormation } from './offlineCacheService';

export type ConfidenceLevel = 'very_high' | 'high' | 'medium' | 'low';
export type IdentificationMethod = 'ai_vision' | 'ai_verified' | 'location_fallback' | 'offline_cache';

export interface RetryPrompt {
  message: string;
  suggestion: string;
  attemptNumber: number;
  suggestedZoom?: number;
}

export interface IdentificationAttempt {
  attemptNumber: number;
  aiConfidence: ConfidenceLevel;
  rawConfidence: number;
  needsRetry: boolean;
  retryPrompt?: RetryPrompt;
  result?: RockIdentificationResult;
}

export interface RockIdentificationResult {
  rock_name: string;
  rock_type: string;
  confidence_score: number;
  confidence_level: ConfidenceLevel;
  identification_method: IdentificationMethod;
  description: string;
  origin: string;
  formation_process: string;
  cool_fact: string;
  minerals: string[];
  hardness: string;
  uses: string[];
  why_here?: string;
  what_else?: string[];
  location_verified: boolean;
  dual_ai_verified?: boolean;
  secondary_ai_result?: string;
  ai_agreement?: boolean;
  stratigraphic_column?: StratigraphicColumn;
}

export interface LocationContext {
  latitude: number;
  longitude: number;
  elevation?: number | null;
  bedrockFormation?: {
    name: string;
    age: string;
    rock_type: string;
    lithology: string;
  };
}

const RETRY_PROMPTS: { [key: string]: RetryPrompt } = {
  unclear_image: {
    message: "I'm having trouble seeing the rock clearly.",
    suggestion: "Could you take another photo with better lighting?",
    attemptNumber: 1,
  },
  need_texture: {
    message: "I need to see more detail to identify this rock.",
    suggestion: "Try getting closer to show the rock's texture and grain.",
    attemptNumber: 2,
  },
  different_angle: {
    message: "The current angle makes identification difficult.",
    suggestion: "Please try a different angle or show a fresh break surface.",
    attemptNumber: 3,
  },
};

class IdentificationService {
  private static instance: IdentificationService;
  private attemptCount: number = 0;
  private maxAttempts: number = 3;
  private currentSessionId: string = '';
  private verificationCache: Map<string, { 
    secondary_identification: string;
    agreement: boolean;
    timestamp: number;
  }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000;

  private constructor() {}

  static getInstance(): IdentificationService {
    if (!IdentificationService.instance) {
      IdentificationService.instance = new IdentificationService();
    }
    return IdentificationService.instance;
  }

  resetSession(): void {
    this.attemptCount = 0;
    this.currentSessionId = Date.now().toString();
    this.cleanupExpiredCache();
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.verificationCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.verificationCache.delete(key);
      }
    }
  }

  private getCacheKey(primaryIdentification: string): string {
    return `${primaryIdentification.toLowerCase().trim()}`;
  }

  getAttemptCount(): number {
    return this.attemptCount;
  }

  async identifyRock(
    imageUri: string,
    locationContext?: LocationContext,
    isPro: boolean = false,
    currentZoom: number = 0
  ): Promise<IdentificationAttempt> {
    this.attemptCount++;

    try {
      let base64Image: string | null = null;
      if (Platform.OS !== 'web') {
        base64Image = await FileSystem.readAsStringAsync(imageUri, {
          encoding: 'base64',
        });
      }

      const response = await fetch(new URL('/api/identify-rock-v2', getApiUrl()).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Image,
          imageUri: Platform.OS === 'web' ? imageUri : undefined,
          location: locationContext ? {
            latitude: locationContext.latitude,
            longitude: locationContext.longitude,
            elevation: locationContext.elevation,
          } : undefined,
          formation: locationContext?.bedrockFormation,
          attemptNumber: this.attemptCount,
          isPro,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const rawConfidence = data.result?.confidence_score || 0;
      const confidenceLevel = this.getConfidenceLevel(rawConfidence);
      const needsRetry = confidenceLevel === 'low' && this.attemptCount < this.maxAttempts;

      if (needsRetry) {
        const aiRephotoGuidance = data.result?.rephoto_guidance;
        const retryPrompt = aiRephotoGuidance 
          ? this.getSmartRetryPrompt(aiRephotoGuidance, this.attemptCount, currentZoom)
          : this.getRetryPrompt(this.attemptCount, data.result?.uncertainty_reason);
        
        return {
          attemptNumber: this.attemptCount,
          aiConfidence: confidenceLevel,
          rawConfidence,
          needsRetry: true,
          retryPrompt,
        };
      }

      if (this.attemptCount >= this.maxAttempts && confidenceLevel === 'low') {
        return this.performLocationFallback(locationContext);
      }

      let finalResult = data.result as RockIdentificationResult;
      finalResult.confidence_level = confidenceLevel;
      finalResult.identification_method = 'ai_vision';

      if (locationContext) {
        finalResult = await this.crossCheckWithLocation(finalResult, locationContext);
      }

      if (isPro && (finalResult.confidence_level === 'high' || finalResult.confidence_level === 'very_high')) {
        finalResult = await this.performDualAIVerification(imageUri, base64Image, finalResult, locationContext);
      }

      if (locationContext) {
        const stratigraphicColumn = await macrostratService.getStratigraphicColumn(
          locationContext.latitude,
          locationContext.longitude
        );
        if (stratigraphicColumn) {
          finalResult.stratigraphic_column = stratigraphicColumn;
        }
      }

      return {
        attemptNumber: this.attemptCount,
        aiConfidence: finalResult.confidence_level,
        rawConfidence: finalResult.confidence_score,
        needsRetry: false,
        result: finalResult,
      };
    } catch (error) {
      console.error('Identification error:', error);
      
      if (this.attemptCount < this.maxAttempts) {
        return {
          attemptNumber: this.attemptCount,
          aiConfidence: 'low',
          rawConfidence: 0,
          needsRetry: true,
          retryPrompt: {
            message: "Something went wrong with the analysis.",
            suggestion: "Please try taking another photo.",
            attemptNumber: this.attemptCount,
          },
        };
      }
      
      return this.performLocationFallback(locationContext);
    }
  }

  private getConfidenceLevel(score: number): ConfidenceLevel {
    if (score >= 0.95) return 'very_high';
    if (score >= 0.75) return 'high';
    if (score >= 0.50) return 'medium';
    return 'low';
  }

  private getRetryPrompt(attempt: number, uncertaintyReason?: string): RetryPrompt {
    if (uncertaintyReason === 'blur' || attempt === 1) {
      return { ...RETRY_PROMPTS.unclear_image, attemptNumber: attempt };
    }
    if (uncertaintyReason === 'texture' || attempt === 2) {
      return { ...RETRY_PROMPTS.need_texture, attemptNumber: attempt };
    }
    return { ...RETRY_PROMPTS.different_angle, attemptNumber: attempt };
  }

  private getSmartRetryPrompt(aiGuidance: string, attempt: number, currentZoom?: number): RetryPrompt {
    const lines = aiGuidance.split(/[.!?]+/).filter(Boolean);
    const message = lines[0]?.trim() || "Let's try again for a better identification.";
    const suggestion = lines.slice(1).join('. ').trim() || aiGuidance;
    
    const suggestedZoom = this.extractZoomSuggestion(aiGuidance, currentZoom);
    
    return {
      message,
      suggestion: suggestedZoom !== undefined 
        ? suggestion.replace(/step back|zoom out|too close/gi, `zoom adjusted to ${this.getZoomLabel(suggestedZoom)}`)
        : (suggestion || "Please try taking another photo with the suggested improvements."),
      attemptNumber: attempt,
      suggestedZoom,
    };
  }

  private extractZoomSuggestion(guidance: string, currentZoom?: number): number | undefined {
    const lowerGuidance = guidance.toLowerCase();
    const current = currentZoom ?? 0.5;
    
    if (lowerGuidance.includes('too close') || lowerGuidance.includes('step back') || 
        lowerGuidance.includes('zoom out') || lowerGuidance.includes('further away')) {
      if (current >= 0.5) return 0.25;
      if (current >= 0.25) return 0;
      return undefined;
    }
    
    if (lowerGuidance.includes('too far') || lowerGuidance.includes('get closer') || 
        lowerGuidance.includes('zoom in') || lowerGuidance.includes('more detail')) {
      if (current <= 0) return 0.25;
      if (current <= 0.25) return 0.5;
      if (current <= 0.5) return 0.75;
      return undefined;
    }
    
    return undefined;
  }

  private getZoomLabel(zoom: number): string {
    if (zoom === 0) return '1x';
    if (zoom === 0.25) return '2x';
    if (zoom === 0.5) return '4x';
    if (zoom === 0.75) return '8x';
    return `${Math.round((zoom + 1) * 4) / 4}x`;
  }

  private async performLocationFallback(
    locationContext?: LocationContext
  ): Promise<IdentificationAttempt> {
    try {
      if (!locationContext) {
        const location = await locationService.getLocationWithElevation();
        if (location) {
          locationContext = {
            latitude: location.latitude,
            longitude: location.longitude,
            elevation: location.altitude,
          };
        }
      }

      if (!locationContext) {
        throw new Error('No location available for fallback');
      }

      const stratigraphicColumn = await macrostratService.getStratigraphicColumn(
        locationContext.latitude,
        locationContext.longitude
      );

      if (!stratigraphicColumn || stratigraphicColumn.units.length === 0) {
        throw new Error('No geological data for this location');
      }

      const topUnit = stratigraphicColumn.units[0];
      const usgsData = await usgsService.getGeologicalFormation(
        locationContext.latitude,
        locationContext.longitude
      );

      const result: RockIdentificationResult = {
        rock_name: this.extractRockName(topUnit.lith, topUnit.unit_name),
        rock_type: this.inferRockType(topUnit.lith),
        confidence_score: 0.45,
        confidence_level: 'low',
        identification_method: 'location_fallback',
        description: `Based on your location, the most likely surface rock is from the ${topUnit.unit_name}. This is a location-based guess since we couldn't clearly identify the rock from your photo.`,
        origin: `This formation is from the ${macrostratService.getGeologicPeriod(topUnit.t_age)} period, approximately ${macrostratService.formatAge(topUnit.t_age)} ago.`,
        formation_process: `The ${topUnit.unit_name} was formed in a ${topUnit.environ.toLowerCase()} environment.`,
        cool_fact: `This geological unit can be up to ${topUnit.max_thick} meters thick in some areas.`,
        minerals: this.inferMinerals(topUnit.lith),
        hardness: this.inferHardness(topUnit.lith),
        uses: this.inferUses(topUnit.lith),
        location_verified: true,
        stratigraphic_column: stratigraphicColumn,
        why_here: usgsData?.formation?.description || `This area is underlain by the ${topUnit.strat_name_long}.`,
        what_else: stratigraphicColumn.units.slice(1, 4).map(u => this.extractRockName(u.lith, u.unit_name)),
      };

      return {
        attemptNumber: this.attemptCount,
        aiConfidence: 'low',
        rawConfidence: 0.45,
        needsRetry: false,
        result,
      };
    } catch (error) {
      console.error('Location fallback error:', error);
      return {
        attemptNumber: this.attemptCount,
        aiConfidence: 'low',
        rawConfidence: 0.30,
        needsRetry: false,
        result: {
          rock_name: 'Unknown Rock',
          rock_type: 'Unknown',
          confidence_score: 0.30,
          confidence_level: 'low',
          identification_method: 'location_fallback',
          description: 'We could not identify this rock from the image or location data.',
          origin: 'Origin could not be determined.',
          formation_process: 'Formation process unknown.',
          cool_fact: 'Every rock has a unique geological story waiting to be discovered!',
          minerals: [],
          hardness: 'Unknown',
          uses: [],
          location_verified: false,
        },
      };
    }
  }

  private async crossCheckWithLocation(
    result: RockIdentificationResult,
    locationContext: LocationContext
  ): Promise<RockIdentificationResult> {
    try {
      const stratigraphicColumn = await macrostratService.getStratigraphicColumn(
        locationContext.latitude,
        locationContext.longitude
      );

      if (!stratigraphicColumn) {
        return result;
      }

      const rockNameLower = result.rock_name.toLowerCase();
      const lithologies = stratigraphicColumn.units.map(u => u.lith.toLowerCase());
      const unitNames = stratigraphicColumn.units.map(u => u.unit_name.toLowerCase());

      const exactMatch = lithologies.some(lith => 
        lith.includes(rockNameLower) || rockNameLower.includes(lith.split(',')[0])
      );

      const formationMatch = unitNames.some(name => 
        name.includes(rockNameLower) || rockNameLower.includes(name.split(' ')[0])
      );

      const rockTypeLower = result.rock_type.toLowerCase();
      const geologicallySimilar = lithologies.some(lith => {
        if (rockTypeLower === 'sedimentary') {
          return lith.includes('limestone') || lith.includes('sandstone') || 
                 lith.includes('shale') || lith.includes('dolomite');
        }
        if (rockTypeLower === 'igneous') {
          return lith.includes('granite') || lith.includes('basalt') || 
                 lith.includes('volcanic') || lith.includes('intrusive');
        }
        if (rockTypeLower === 'metamorphic') {
          return lith.includes('schist') || lith.includes('gneiss') || 
                 lith.includes('marble') || lith.includes('slate');
        }
        return false;
      });

      let adjustedScore = result.confidence_score;
      let adjustedLevel = result.confidence_level;

      if (exactMatch || formationMatch) {
        adjustedScore = Math.min(0.95, result.confidence_score + 0.15);
        adjustedLevel = adjustedScore >= 0.90 ? 'very_high' : 'high';
        result.location_verified = true;
      } else if (geologicallySimilar) {
        adjustedScore = Math.min(0.75, result.confidence_score + 0.05);
        adjustedLevel = 'medium';
        result.location_verified = true;
      } else {
        adjustedScore = Math.max(0.40, result.confidence_score - 0.10);
        adjustedLevel = adjustedScore >= 0.50 ? 'medium' : 'low';
        result.location_verified = false;
      }

      return {
        ...result,
        confidence_score: adjustedScore,
        confidence_level: adjustedLevel,
        stratigraphic_column: stratigraphicColumn,
      };
    } catch (error) {
      console.error('Location cross-check error:', error);
      return result;
    }
  }

  private async performDualAIVerification(
    imageUri: string,
    base64Image: string | null,
    result: RockIdentificationResult,
    locationContext?: LocationContext
  ): Promise<RockIdentificationResult> {
    try {
      const cacheKey = this.getCacheKey(result.rock_name);
      const cachedResult = this.verificationCache.get(cacheKey);
      
      if (cachedResult && Date.now() - cachedResult.timestamp < this.CACHE_TTL) {
        result.dual_ai_verified = true;
        result.secondary_ai_result = cachedResult.secondary_identification;
        result.ai_agreement = cachedResult.agreement;

        if (cachedResult.agreement) {
          result.confidence_score = Math.min(0.99, result.confidence_score + 0.05);
          result.confidence_level = 'very_high';
          result.identification_method = 'ai_verified';
        }

        return result;
      }

      const response = await fetch(new URL('/api/verify-identification', getApiUrl()).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Image,
          imageUri: Platform.OS === 'web' ? imageUri : undefined,
          primaryIdentification: result.rock_name,
          primaryRockType: result.rock_type,
          location: locationContext ? {
            latitude: locationContext.latitude,
            longitude: locationContext.longitude,
          } : undefined,
        }),
      });

      if (!response.ok) {
        return result;
      }

      const verificationData = await response.json();
      
      this.verificationCache.set(cacheKey, {
        secondary_identification: verificationData.secondary_identification,
        agreement: verificationData.agreement,
        timestamp: Date.now(),
      });
      
      result.dual_ai_verified = true;
      result.secondary_ai_result = verificationData.secondary_identification;
      result.ai_agreement = verificationData.agreement;

      if (verificationData.agreement) {
        result.confidence_score = Math.min(0.99, result.confidence_score + 0.05);
        result.confidence_level = 'very_high';
        result.identification_method = 'ai_verified';
      }

      return result;
    } catch (error) {
      console.error('Dual AI verification error:', error);
      return result;
    }
  }

  async identifyRockOffline(
    locationContext: LocationContext
  ): Promise<IdentificationAttempt> {
    try {
      const offlineResult = await offlineCacheService.performOfflineIdentification(
        locationContext.latitude,
        locationContext.longitude
      );

      if (!offlineResult.success || !offlineResult.bestGuess) {
        return {
          attemptNumber: this.attemptCount,
          aiConfidence: 'low',
          rawConfidence: 0.2,
          needsRetry: false,
          result: {
            rock_name: 'Unknown Rock',
            rock_type: 'Unknown',
            confidence_score: 0.2,
            confidence_level: 'low',
            identification_method: 'offline_cache',
            description: 'No cached geological data available for this location. Connect to the internet to download data for this area.',
            origin: 'Unable to determine without network access.',
            formation_process: 'Connect to the internet and identify rocks in this area to cache the data for offline use.',
            cool_fact: 'GeoID Pro caches geological data from your previous identifications so you can use it offline!',
            minerals: [],
            hardness: 'Unknown',
            uses: [],
            location_verified: false,
          },
        };
      }

      const best = offlineResult.bestGuess;
      const formations = offlineResult.formations;

      return {
        attemptNumber: this.attemptCount,
        aiConfidence: 'medium',
        rawConfidence: 0.55,
        needsRetry: false,
        result: {
          rock_name: best.name,
          rock_type: best.rockType,
          confidence_score: 0.55,
          confidence_level: 'medium',
          identification_method: 'offline_cache',
          description: `${best.description} This identification is based on cached geological data for your location. ${best.visualCharacteristics.length > 0 ? `Look for: ${best.visualCharacteristics.slice(0, 2).join(', ')}.` : ''}`,
          origin: `From the ${best.period} period (${best.age}). Formed in a ${best.environment} environment.`,
          formation_process: `This ${best.rockType.toLowerCase()} rock formed through ${best.rockType === 'Sedimentary' ? 'deposition and compaction of sediments' : best.rockType === 'Igneous' ? 'cooling and solidification of magma or lava' : 'heat and pressure transforming existing rock'}.`,
          cool_fact: `This area contains ${formations.length} known geological formation${formations.length !== 1 ? 's' : ''} spanning from the ${formations[formations.length - 1]?.period || 'ancient'} to the ${formations[0]?.period || 'recent'} period.`,
          minerals: best.minerals,
          hardness: best.hardness,
          uses: best.commonUses,
          why_here: `The ${offlineResult.regionName} geological column contains ${best.name} at this location.`,
          what_else: formations.slice(1, 4).map(f => f.name),
          location_verified: true,
        },
      };
    } catch (error) {
      console.error('Offline identification error:', error);
      return {
        attemptNumber: this.attemptCount,
        aiConfidence: 'low',
        rawConfidence: 0.15,
        needsRetry: false,
        result: {
          rock_name: 'Unknown Rock',
          rock_type: 'Unknown',
          confidence_score: 0.15,
          confidence_level: 'low',
          identification_method: 'offline_cache',
          description: 'Offline identification failed. Please try again when connected to the internet.',
          origin: 'Unable to determine.',
          formation_process: 'Unknown.',
          cool_fact: 'Connect to the internet to unlock full AI-powered identification!',
          minerals: [],
          hardness: 'Unknown',
          uses: [],
          location_verified: false,
        },
      };
    }
  }

  async autoCacheAfterIdentification(
    locationContext: LocationContext,
    macrostratUnits?: any[],
    columnName?: string
  ): Promise<void> {
    try {
      if (macrostratUnits && macrostratUnits.length > 0) {
        await offlineCacheService.cacheRegionData(
          locationContext.latitude,
          locationContext.longitude,
          macrostratUnits,
          columnName || 'Local Column'
        );
      } else {
        await offlineCacheService.fetchAndCacheForLocation(
          locationContext.latitude,
          locationContext.longitude
        );
      }
    } catch (error) {
      console.error('Auto-cache failed:', error);
    }
  }

  isOnline(): boolean {
    return offlineCacheService.getIsOnline();
  }

  async checkNetwork(): Promise<boolean> {
    return offlineCacheService.checkNetworkStatus();
  }

  private extractRockName(lithology: string, unitName: string): string {
    const lithParts = lithology.split(',').map(l => l.trim());
    const primaryLith = lithParts[0] || 'Unknown';
    
    const knownRocks = ['limestone', 'sandstone', 'shale', 'granite', 'basalt', 'marble', 
                        'slate', 'gneiss', 'schist', 'dolomite', 'chalk', 'mudstone',
                        'conglomerate', 'siltstone', 'quartzite'];
    
    for (const rock of knownRocks) {
      if (primaryLith.toLowerCase().includes(rock)) {
        return rock.charAt(0).toUpperCase() + rock.slice(1);
      }
    }
    
    return primaryLith.charAt(0).toUpperCase() + primaryLith.slice(1);
  }

  private inferRockType(lithology: string): string {
    const lith = lithology.toLowerCase();
    
    const sedimentary = ['limestone', 'sandstone', 'shale', 'dolomite', 'chalk', 
                         'mudstone', 'conglomerate', 'siltstone', 'claystone'];
    const igneous = ['granite', 'basalt', 'rhyolite', 'andesite', 'diorite', 
                     'gabbro', 'volcanic', 'intrusive'];
    const metamorphic = ['marble', 'slate', 'gneiss', 'schist', 'quartzite', 
                         'phyllite', 'hornfels'];
    
    for (const rock of sedimentary) {
      if (lith.includes(rock)) return 'Sedimentary';
    }
    for (const rock of igneous) {
      if (lith.includes(rock)) return 'Igneous';
    }
    for (const rock of metamorphic) {
      if (lith.includes(rock)) return 'Metamorphic';
    }
    
    return 'Sedimentary';
  }

  private inferMinerals(lithology: string): string[] {
    const lith = lithology.toLowerCase();
    
    if (lith.includes('limestone') || lith.includes('chalk')) {
      return ['Calcite', 'Aragonite'];
    }
    if (lith.includes('sandstone')) {
      return ['Quartz', 'Feldspar', 'Iron oxides'];
    }
    if (lith.includes('granite')) {
      return ['Quartz', 'Feldspar', 'Mica', 'Hornblende'];
    }
    if (lith.includes('basalt')) {
      return ['Plagioclase', 'Pyroxene', 'Olivine'];
    }
    if (lith.includes('shale')) {
      return ['Clay minerals', 'Quartz', 'Calcite'];
    }
    
    return ['Various minerals'];
  }

  private inferHardness(lithology: string): string {
    const lith = lithology.toLowerCase();
    
    if (lith.includes('granite') || lith.includes('quartzite')) {
      return '6-7 (Hard)';
    }
    if (lith.includes('limestone') || lith.includes('marble')) {
      return '3-4 (Medium)';
    }
    if (lith.includes('shale') || lith.includes('chalk')) {
      return '2-3 (Soft)';
    }
    if (lith.includes('sandstone')) {
      return '6-7 (Hard, varies)';
    }
    
    return 'Variable';
  }

  private inferUses(lithology: string): string[] {
    const lith = lithology.toLowerCase();
    
    if (lith.includes('limestone')) {
      return ['Building stone', 'Cement production', 'Agricultural lime'];
    }
    if (lith.includes('granite')) {
      return ['Countertops', 'Monuments', 'Building facades'];
    }
    if (lith.includes('sandstone')) {
      return ['Building stone', 'Paving', 'Glassmaking'];
    }
    if (lith.includes('marble')) {
      return ['Sculpture', 'Flooring', 'Countertops'];
    }
    
    return ['Construction materials'];
  }
}

export const identificationService = IdentificationService.getInstance();
export default identificationService;
