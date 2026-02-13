import { macrostratService } from './macrostratService';
import { getApiUrl } from '@/lib/query-client';

export interface GeologicalPOI {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  type: 'formation' | 'fossil_site' | 'mineral_deposit' | 'outcrop' | 'landmark';
  rockType?: string;
  age?: string;
  period?: string;
  color: string;
  imageUrl?: string;
  source: string;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface GeologicalFeature {
  id: string;
  name: string;
  featureType: 'normal_fault' | 'thrust_fault' | 'strike_slip_fault' | 'fold' | 'contact' | 'unconformity';
  description: string;
  coordinates: Coordinate[];
  properties: Record<string, any>;
  color: string;
  strokeWidth: number;
}

export interface FaultDeepDiveContent {
  whatHappened: string;
  landscape: string;
  weather: string;
  ecosystems: string;
  water: string;
  funFacts: string[];
  sources: string;
  formation_story?: string;
  ecological_impact?: string;
  fun_facts?: string[];
  water_connection?: string;
  drive_by_guide?: string;
}

export interface MacrostratFormation {
  name: string;
  age: string;
  lithology: string;
  environment: string;
  source: string;
}

export interface ViewportBounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

const POI_TYPES = {
  formation: { icon: 'layers', color: '#E07856' },
  fossil_site: { icon: 'archive', color: '#8B4513' },
  mineral_deposit: { icon: 'hexagon', color: '#9370DB' },
  outcrop: { icon: 'map-pin', color: '#2E8B57' },
  landmark: { icon: 'flag', color: '#4169E1' },
};

interface CachedFeatures {
  bounds: ViewportBounds;
  features: GeologicalFeature[];
  formations: MacrostratFormation[];
  timestamp: number;
}

interface FeaturesResponse {
  features: GeologicalFeature[];
  formations: MacrostratFormation[];
}

const CACHE_TTL = 5 * 60 * 1000;
const CACHE_OVERLAP_THRESHOLD = 0.7;

class GeoPOIService {
  private featureCache: CachedFeatures[] = [];
  private maxCacheEntries = 10;

  async getNearbyPOIs(lat: number, lng: number, radiusKm: number = 50): Promise<GeologicalPOI[]> {
    try {
      const url = new URL('/api/explore-pois', getApiUrl());
      url.searchParams.set('lat', lat.toFixed(4));
      url.searchParams.set('lng', lng.toFixed(4));
      url.searchParams.set('radius', radiusKm.toString());

      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        if (data.pois && data.pois.length > 0) {
          console.log(`Loaded ${data.pois.length} POIs from ${Object.entries(data.sources || {}).filter(([k, v]) => k !== 'total' && (v as number) > 0).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
          return data.pois.map((poi: any) => ({
            ...poi,
            type: this.normalizeType(poi.type),
          }));
        }
      }
    } catch (error) {
      console.error('Server POI fetch failed, falling back to client-side:', error);
    }

    return this.getClientSidePOIs(lat, lng, radiusKm);
  }

  private normalizeType(type: string): GeologicalPOI['type'] {
    const valid: GeologicalPOI['type'][] = ['formation', 'fossil_site', 'mineral_deposit', 'outcrop', 'landmark'];
    return valid.includes(type as any) ? type as GeologicalPOI['type'] : 'formation';
  }

  private async getClientSidePOIs(lat: number, lng: number, radiusKm: number): Promise<GeologicalPOI[]> {
    const pois: GeologicalPOI[] = [];

    try {
      const columnData = await macrostratService.getStratigraphicColumn(lat, lng);

      if (columnData && columnData.units.length > 0) {
        columnData.units.slice(0, 10).forEach((unit) => {
          const offsetLat = lat + (Math.random() - 0.5) * 0.1;
          const offsetLng = lng + (Math.random() - 0.5) * 0.1;

          pois.push({
            id: `unit-${unit.unit_id}`,
            name: unit.unit_name,
            description: `${unit.lith} formation from the ${macrostratService.getGeologicPeriod(unit.t_age)} period. Thickness: ${unit.max_thick}m`,
            latitude: offsetLat,
            longitude: offsetLng,
            type: unit.pbdb_collections > 0 ? 'fossil_site' : 'formation',
            rockType: unit.lith,
            age: macrostratService.formatAge(unit.t_age),
            period: macrostratService.getGeologicPeriod(unit.t_age),
            color: unit.color || '#808080',
            source: 'Macrostrat',
          });
        });
      }
    } catch (error) {
      console.error('Client-side POI fetch error:', error);
    }

    return pois;
  }

  async getGeologicalFeatures(bounds: ViewportBounds): Promise<FeaturesResponse> {
    const cached = this.findCachedFeatures(bounds);
    if (cached) {
      console.log(`Using cached fault data (${cached.features.length} features)`);
      return { features: cached.features, formations: cached.formations };
    }

    try {
      const url = new URL('/api/geological-features', getApiUrl());
      url.searchParams.set('minLat', bounds.minLat.toFixed(4));
      url.searchParams.set('minLng', bounds.minLng.toFixed(4));
      url.searchParams.set('maxLat', bounds.maxLat.toFixed(4));
      url.searchParams.set('maxLng', bounds.maxLng.toFixed(4));

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const features: GeologicalFeature[] = data.features || [];
      const formations: MacrostratFormation[] = data.formations || [];

      console.log(`Fetched ${features.length} fault features (USGS: ${data.sources?.usgs_quaternary || 0}, TNRIS: ${data.sources?.tnris || 0}), ${formations.length} Macrostrat formations`);

      this.cacheFeatures(bounds, features, formations);

      return { features, formations };
    } catch (error) {
      console.error('Error fetching geological features:', error);
      return { features: [], formations: [] };
    }
  }

  private findCachedFeatures(bounds: ViewportBounds): CachedFeatures | null {
    const now = Date.now();
    this.featureCache = this.featureCache.filter(c => now - c.timestamp < CACHE_TTL);

    for (const cached of this.featureCache) {
      if (this.boundsContainedBy(bounds, cached.bounds)) {
        return cached;
      }
    }
    return null;
  }

  private boundsContainedBy(inner: ViewportBounds, outer: ViewportBounds): boolean {
    return inner.minLat >= outer.minLat &&
      inner.minLng >= outer.minLng &&
      inner.maxLat <= outer.maxLat &&
      inner.maxLng <= outer.maxLng;
  }

  private cacheFeatures(bounds: ViewportBounds, features: GeologicalFeature[], formations: MacrostratFormation[] = []): void {
    const padLat = (bounds.maxLat - bounds.minLat) * 0.2;
    const padLng = (bounds.maxLng - bounds.minLng) * 0.2;
    const paddedBounds: ViewportBounds = {
      minLat: bounds.minLat - padLat,
      minLng: bounds.minLng - padLng,
      maxLat: bounds.maxLat + padLat,
      maxLng: bounds.maxLng + padLng,
    };

    this.featureCache.push({
      bounds: paddedBounds,
      features,
      formations,
      timestamp: Date.now(),
    });

    if (this.featureCache.length > this.maxCacheEntries) {
      this.featureCache.shift();
    }
  }

  async getFaultDeepDive(
    faultName: string,
    faultProperties: Record<string, any>,
    userLat?: number,
    userLng?: number,
    macrostratContext?: MacrostratFormation[]
  ): Promise<FaultDeepDiveContent | null> {
    try {
      const url = new URL('/api/fault-deep-dive', getApiUrl());
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faultName, faultProperties, userLat, userLng, macrostratContext }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.content || null;
    } catch (error) {
      console.error('Error fetching fault deep dive:', error);
      return null;
    }
  }

  getFeatureTypeLabel(featureType: string): string {
    const labels: Record<string, string> = {
      normal_fault: 'Normal Fault',
      thrust_fault: 'Thrust Fault',
      strike_slip_fault: 'Strike-Slip Fault',
      fold: 'Fold',
      contact: 'Geological Contact',
      unconformity: 'Unconformity',
    };
    return labels[featureType] || 'Geological Feature';
  }

  getIconForType(type: GeologicalPOI['type']): string {
    return POI_TYPES[type]?.icon || 'map-pin';
  }

  getColorForType(type: GeologicalPOI['type']): string {
    return POI_TYPES[type]?.color || '#808080';
  }

  getTypeLabel(type: GeologicalPOI['type']): string {
    const labels: Record<GeologicalPOI['type'], string> = {
      formation: 'Rock Formation',
      fossil_site: 'Fossil Site',
      mineral_deposit: 'Mineral Deposit',
      outcrop: 'Outcrop',
      landmark: 'Geological Landmark',
    };
    return labels[type] || 'Point of Interest';
  }
}

export const geoPOIService = new GeoPOIService();
