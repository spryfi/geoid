import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { getApiUrl } from '@/lib/query-client';

const CACHE_KEY_PREFIX = 'geoid_geo_cache_';
const CACHE_INDEX_KEY = 'geoid_geo_cache_index';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const MAX_CACHED_REGIONS = 20;

export interface CachedFormation {
  name: string;
  rockType: string;
  lithology: string;
  age: string;
  period: string;
  environment: string;
  color: string;
  description: string;
  visualCharacteristics: string[];
  keyIdentifiers: string[];
  minerals: string[];
  hardness: string;
  commonUses: string[];
  referenceImagePath?: string;
}

export interface CachedRegionData {
  geohash: string;
  latitude: number;
  longitude: number;
  cachedAt: number;
  formations: CachedFormation[];
  columnName: string;
  rockTypes: string[];
  totalFormations: number;
}

export interface CacheStatus {
  isOnline: boolean;
  cachedRegionsCount: number;
  currentLocationCached: boolean;
  lastCacheUpdate: number | null;
  cacheSize: string;
}

class OfflineCacheService {
  private static instance: OfflineCacheService;
  private isOnline: boolean = true;
  private networkUnsubscribe: (() => void) | null = null;

  private constructor() {
    this.initNetworkListener();
  }

  static getInstance(): OfflineCacheService {
    if (!OfflineCacheService.instance) {
      OfflineCacheService.instance = new OfflineCacheService();
    }
    return OfflineCacheService.instance;
  }

  private initNetworkListener(): void {
    this.networkUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      this.isOnline = state.isConnected === true && state.isInternetReachable !== false;
    });
  }

  getIsOnline(): boolean {
    return this.isOnline;
  }

  async checkNetworkStatus(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      this.isOnline = state.isConnected === true && state.isInternetReachable !== false;
      return this.isOnline;
    } catch {
      return this.isOnline;
    }
  }

  private getGeohash(lat: number, lng: number): string {
    const latBucket = Math.round(lat * 10) / 10;
    const lngBucket = Math.round(lng * 10) / 10;
    return `${latBucket}_${lngBucket}`;
  }

  private getCacheKey(geohash: string): string {
    return `${CACHE_KEY_PREFIX}${geohash}`;
  }

  async cacheRegionData(
    latitude: number,
    longitude: number,
    macrostratUnits: any[],
    columnName: string
  ): Promise<void> {
    try {
      const geohash = this.getGeohash(latitude, longitude);
      const formations: CachedFormation[] = macrostratUnits.map(unit => ({
        name: unit.unit_name || unit.strat_name_long || 'Unknown',
        rockType: this.inferRockType(unit.lith || ''),
        lithology: typeof unit.lith === 'string' ? unit.lith : 
          Array.isArray(unit.lith) ? unit.lith.map((l: any) => l.name || l).join(', ') : 'Unknown',
        age: `${unit.t_age || 0} - ${unit.b_age || 0} Ma`,
        period: this.getGeologicPeriod(unit.t_age || 0),
        environment: typeof unit.environ === 'string' ? unit.environ :
          Array.isArray(unit.environ) ? unit.environ.map((e: any) => e.name || e).join(', ') : 'Unknown',
        color: unit.color || '#808080',
        description: `${unit.strat_name_long || unit.unit_name || 'Unknown'} formation from the ${this.getGeologicPeriod(unit.t_age || 0)} period.`,
        visualCharacteristics: this.getVisualCharacteristics(unit.lith || ''),
        keyIdentifiers: this.getKeyIdentifiers(unit.lith || ''),
        minerals: this.inferMinerals(unit.lith || ''),
        hardness: this.inferHardness(unit.lith || ''),
        commonUses: this.inferUses(unit.lith || ''),
      }));

      const rockTypes = [...new Set(formations.map(f => f.rockType))];

      const regionData: CachedRegionData = {
        geohash,
        latitude,
        longitude,
        cachedAt: Date.now(),
        formations,
        columnName,
        rockTypes,
        totalFormations: formations.length,
      };

      await AsyncStorage.setItem(this.getCacheKey(geohash), JSON.stringify(regionData));
      await this.updateCacheIndex(geohash);
      await this.pruneOldCaches();
    } catch (error) {
      console.error('Failed to cache region data:', error);
    }
  }

  async fetchAndCacheForLocation(latitude: number, longitude: number): Promise<CachedRegionData | null> {
    try {
      const isOnline = await this.checkNetworkStatus();
      if (!isOnline) return null;

      const geohash = this.getGeohash(latitude, longitude);
      const existing = await this.getCachedRegion(geohash);
      if (existing && Date.now() - existing.cachedAt < CACHE_TTL) {
        return existing;
      }

      const response = await fetch(
        new URL(`/api/cache-region-data?lat=${latitude}&lng=${longitude}`, getApiUrl()).toString()
      );

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      if (data.success && data.formations) {
        const regionData: CachedRegionData = {
          geohash,
          latitude,
          longitude,
          cachedAt: Date.now(),
          formations: data.formations,
          columnName: data.columnName || 'Local Column',
          rockTypes: data.rockTypes || [],
          totalFormations: data.formations.length,
        };

        await AsyncStorage.setItem(this.getCacheKey(geohash), JSON.stringify(regionData));
        await this.updateCacheIndex(geohash);
        await this.pruneOldCaches();

        return regionData;
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch and cache region data:', error);
      return null;
    }
  }

  async getCachedRegion(geohash: string): Promise<CachedRegionData | null> {
    try {
      const data = await AsyncStorage.getItem(this.getCacheKey(geohash));
      if (!data) return null;

      const parsed: CachedRegionData = JSON.parse(data);
      if (Date.now() - parsed.cachedAt > CACHE_TTL) {
        await AsyncStorage.removeItem(this.getCacheKey(geohash));
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  async getCachedDataForLocation(latitude: number, longitude: number): Promise<CachedRegionData | null> {
    const geohash = this.getGeohash(latitude, longitude);
    const exactMatch = await this.getCachedRegion(geohash);
    if (exactMatch) return exactMatch;

    const nearby = [
      this.getGeohash(latitude + 0.1, longitude),
      this.getGeohash(latitude - 0.1, longitude),
      this.getGeohash(latitude, longitude + 0.1),
      this.getGeohash(latitude, longitude - 0.1),
    ];

    for (const hash of nearby) {
      const cached = await this.getCachedRegion(hash);
      if (cached) return cached;
    }

    return null;
  }

  async performOfflineIdentification(
    latitude: number,
    longitude: number
  ): Promise<{
    success: boolean;
    formations: CachedFormation[];
    bestGuess: CachedFormation | null;
    regionName: string;
    isOfflineResult: boolean;
  }> {
    const cached = await this.getCachedDataForLocation(latitude, longitude);

    if (!cached || cached.formations.length === 0) {
      return {
        success: false,
        formations: [],
        bestGuess: null,
        regionName: 'Unknown Region',
        isOfflineResult: true,
      };
    }

    const bestGuess = cached.formations[0];

    return {
      success: true,
      formations: cached.formations,
      bestGuess,
      regionName: cached.columnName,
      isOfflineResult: true,
    };
  }

  async getCacheStatus(latitude?: number, longitude?: number): Promise<CacheStatus> {
    try {
      const indexData = await AsyncStorage.getItem(CACHE_INDEX_KEY);
      const index: string[] = indexData ? JSON.parse(indexData) : [];

      let currentLocationCached = false;
      let lastCacheUpdate: number | null = null;

      if (latitude !== undefined && longitude !== undefined) {
        const geohash = this.getGeohash(latitude, longitude);
        const cached = await this.getCachedRegion(geohash);
        currentLocationCached = cached !== null;
        if (cached) lastCacheUpdate = cached.cachedAt;
      }

      return {
        isOnline: this.isOnline,
        cachedRegionsCount: index.length,
        currentLocationCached,
        lastCacheUpdate,
        cacheSize: `${index.length} regions`,
      };
    } catch {
      return {
        isOnline: this.isOnline,
        cachedRegionsCount: 0,
        currentLocationCached: false,
        lastCacheUpdate: null,
        cacheSize: '0 regions',
      };
    }
  }

  async clearCache(): Promise<void> {
    try {
      const indexData = await AsyncStorage.getItem(CACHE_INDEX_KEY);
      const index: string[] = indexData ? JSON.parse(indexData) : [];

      for (const geohash of index) {
        await AsyncStorage.removeItem(this.getCacheKey(geohash));
      }
      await AsyncStorage.removeItem(CACHE_INDEX_KEY);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  private async updateCacheIndex(geohash: string): Promise<void> {
    try {
      const indexData = await AsyncStorage.getItem(CACHE_INDEX_KEY);
      const index: string[] = indexData ? JSON.parse(indexData) : [];

      if (!index.includes(geohash)) {
        index.push(geohash);
        await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
      }
    } catch (error) {
      console.error('Failed to update cache index:', error);
    }
  }

  private async pruneOldCaches(): Promise<void> {
    try {
      const indexData = await AsyncStorage.getItem(CACHE_INDEX_KEY);
      if (!indexData) return;

      const index: string[] = JSON.parse(indexData);
      if (index.length <= MAX_CACHED_REGIONS) return;

      const cacheEntries: { geohash: string; cachedAt: number }[] = [];
      for (const geohash of index) {
        const data = await AsyncStorage.getItem(this.getCacheKey(geohash));
        if (data) {
          const parsed = JSON.parse(data);
          cacheEntries.push({ geohash, cachedAt: parsed.cachedAt || 0 });
        }
      }

      cacheEntries.sort((a, b) => b.cachedAt - a.cachedAt);
      const toRemove = cacheEntries.slice(MAX_CACHED_REGIONS);

      for (const entry of toRemove) {
        await AsyncStorage.removeItem(this.getCacheKey(entry.geohash));
      }

      const newIndex = cacheEntries.slice(0, MAX_CACHED_REGIONS).map(e => e.geohash);
      await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(newIndex));
    } catch (error) {
      console.error('Failed to prune caches:', error);
    }
  }

  private inferRockType(lithology: string): string {
    const lith = typeof lithology === 'string' ? lithology.toLowerCase() : '';
    const sedimentary = ['limestone', 'sandstone', 'shale', 'dolomite', 'chalk', 'mudstone', 'conglomerate', 'siltstone'];
    const igneous = ['granite', 'basalt', 'rhyolite', 'andesite', 'diorite', 'gabbro', 'volcanic'];
    const metamorphic = ['marble', 'slate', 'gneiss', 'schist', 'quartzite', 'phyllite'];

    for (const r of sedimentary) { if (lith.includes(r)) return 'Sedimentary'; }
    for (const r of igneous) { if (lith.includes(r)) return 'Igneous'; }
    for (const r of metamorphic) { if (lith.includes(r)) return 'Metamorphic'; }
    return 'Sedimentary';
  }

  private getVisualCharacteristics(lithology: string): string[] {
    const lith = typeof lithology === 'string' ? lithology.toLowerCase() : '';
    if (lith.includes('limestone')) return ['Light gray to tan color', 'Fine-grained texture', 'May contain fossils', 'Fizzes with acid'];
    if (lith.includes('sandstone')) return ['Sandy texture', 'Gritty feel', 'Visible grain structure', 'Red, tan, or white color'];
    if (lith.includes('shale')) return ['Thin layered sheets', 'Dark gray to black', 'Soft and flaky', 'Earthy smell when wet'];
    if (lith.includes('granite')) return ['Speckled appearance', 'Coarse crystals visible', 'Pink, gray, or white', 'Hard and durable'];
    if (lith.includes('basalt')) return ['Dark gray to black', 'Fine-grained', 'May have small holes (vesicles)', 'Dense and heavy'];
    if (lith.includes('marble')) return ['Crystalline texture', 'White or colored', 'Smooth when polished', 'Fizzes with acid'];
    if (lith.includes('dolomite')) return ['Similar to limestone', 'Slightly harder', 'Tan to light gray', 'Reacts slowly with acid'];
    if (lith.includes('chalk')) return ['Very soft', 'White color', 'Leaves marks on surfaces', 'Fine-grained'];
    if (lith.includes('slate')) return ['Flat and smooth', 'Dark gray', 'Splits into thin sheets', 'Rings when tapped'];
    if (lith.includes('quartzite')) return ['Very hard', 'Glassy appearance', 'Breaks across grains', 'Light colored'];
    return ['Variable appearance', 'Examine color and texture', 'Check grain size', 'Note any layering'];
  }

  private getKeyIdentifiers(lithology: string): string[] {
    const lith = typeof lithology === 'string' ? lithology.toLowerCase() : '';
    if (lith.includes('limestone')) return ['Acid test (fizzes with HCl)', 'Fossil presence', 'Hardness ~3-4'];
    if (lith.includes('sandstone')) return ['Gritty texture', 'Visible sand grains', 'Variable hardness'];
    if (lith.includes('shale')) return ['Fissile layering', 'Soft (scratches with nail)', 'Clay composition'];
    if (lith.includes('granite')) return ['Interlocking crystals', 'Contains quartz, feldspar, mica', 'Hardness 6-7'];
    if (lith.includes('basalt')) return ['Very dark color', 'Fine-grained or glassy', 'May be vesicular'];
    return ['Examine crystal structure', 'Test hardness', 'Check for layering'];
  }

  private inferMinerals(lithology: string): string[] {
    const lith = typeof lithology === 'string' ? lithology.toLowerCase() : '';
    if (lith.includes('limestone') || lith.includes('chalk')) return ['Calcite', 'Aragonite'];
    if (lith.includes('sandstone')) return ['Quartz', 'Feldspar', 'Iron oxides'];
    if (lith.includes('granite')) return ['Quartz', 'Feldspar', 'Mica', 'Hornblende'];
    if (lith.includes('basalt')) return ['Plagioclase', 'Pyroxene', 'Olivine'];
    if (lith.includes('shale')) return ['Clay minerals', 'Quartz', 'Calcite'];
    return ['Various minerals'];
  }

  private inferHardness(lithology: string): string {
    const lith = typeof lithology === 'string' ? lithology.toLowerCase() : '';
    if (lith.includes('granite') || lith.includes('quartzite')) return '6-7 (Hard)';
    if (lith.includes('limestone') || lith.includes('marble')) return '3-4 (Medium)';
    if (lith.includes('shale') || lith.includes('chalk')) return '2-3 (Soft)';
    if (lith.includes('sandstone')) return '6-7 (Hard, varies)';
    return 'Variable';
  }

  private inferUses(lithology: string): string[] {
    const lith = typeof lithology === 'string' ? lithology.toLowerCase() : '';
    if (lith.includes('limestone')) return ['Building stone', 'Cement production', 'Agricultural lime'];
    if (lith.includes('granite')) return ['Countertops', 'Monuments', 'Building facades'];
    if (lith.includes('sandstone')) return ['Building stone', 'Paving', 'Glassmaking'];
    if (lith.includes('marble')) return ['Sculpture', 'Flooring', 'Countertops'];
    return ['Construction materials'];
  }

  private getGeologicPeriod(age: number): string {
    if (age < 0.0117) return 'Holocene';
    if (age < 2.58) return 'Pleistocene';
    if (age < 5.33) return 'Pliocene';
    if (age < 23.03) return 'Miocene';
    if (age < 33.9) return 'Oligocene';
    if (age < 56) return 'Eocene';
    if (age < 66) return 'Paleocene';
    if (age < 145) return 'Cretaceous';
    if (age < 201.3) return 'Jurassic';
    if (age < 251.9) return 'Triassic';
    if (age < 298.9) return 'Permian';
    if (age < 358.9) return 'Carboniferous';
    if (age < 419.2) return 'Devonian';
    if (age < 443.8) return 'Silurian';
    if (age < 485.4) return 'Ordovician';
    if (age < 538.8) return 'Cambrian';
    if (age < 2500) return 'Proterozoic';
    return 'Archean';
  }

  destroy(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
    }
  }
}

export const offlineCacheService = OfflineCacheService.getInstance();
export default offlineCacheService;
