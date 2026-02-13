export interface GeologicalFormation {
  unitName: string;
  unitAge: string;
  rockType: string;
  lithology: string;
  description: string;
  source: string;
}

export interface USGSResponse {
  formation: GeologicalFormation | null;
  rawData: any;
  error?: string;
}

const ROCK_TYPE_MAPPING: Record<string, string[]> = {
  sandstone: ['Sandstone', 'Quartzite', 'Arkose'],
  limestone: ['Limestone', 'Dolomite', 'Chalk', 'Travertine'],
  shale: ['Shale', 'Mudstone', 'Siltstone'],
  granite: ['Granite', 'Pegmatite', 'Aplite'],
  basalt: ['Basalt', 'Scoria', 'Obsidian'],
  metamorphic: ['Schist', 'Gneiss', 'Marble', 'Slate', 'Quartzite'],
  volcanic: ['Rhyolite', 'Andesite', 'Tuff', 'Pumice'],
  sedimentary: ['Conglomerate', 'Breccia', 'Claystone'],
};

const FORMATION_ROCK_SUGGESTIONS: Record<string, { rocks: string[]; description: string }> = {
  default: {
    rocks: ['Granite', 'Sandstone', 'Limestone'],
    description: 'Common rocks found in many geological settings.',
  },
  quaternary: {
    rocks: ['Sandstone', 'Conglomerate', 'Shale', 'Limestone'],
    description: 'Young sedimentary deposits from the last 2.6 million years.',
  },
  tertiary: {
    rocks: ['Sandstone', 'Shale', 'Volcanic Tuff', 'Basalt'],
    description: 'Cenozoic era rocks, often volcanic or sedimentary.',
  },
  cretaceous: {
    rocks: ['Limestone', 'Chalk', 'Sandstone', 'Shale'],
    description: 'Mesozoic era marine and coastal deposits.',
  },
  jurassic: {
    rocks: ['Sandstone', 'Limestone', 'Shale', 'Mudstone'],
    description: 'Mesozoic era deposits, including famous formations like Navajo Sandstone.',
  },
  triassic: {
    rocks: ['Red Sandstone', 'Shale', 'Limestone', 'Conglomerate'],
    description: 'Early Mesozoic deposits, often red-colored continental sediments.',
  },
  paleozoic: {
    rocks: ['Limestone', 'Dolomite', 'Sandstone', 'Shale'],
    description: 'Ancient marine deposits from 541-252 million years ago.',
  },
  precambrian: {
    rocks: ['Granite', 'Gneiss', 'Schist', 'Quartzite'],
    description: 'The oldest rocks on Earth, often heavily metamorphosed.',
  },
  igneous: {
    rocks: ['Granite', 'Basalt', 'Rhyolite', 'Diorite'],
    description: 'Rocks formed from cooling magma or lava.',
  },
  volcanic: {
    rocks: ['Basalt', 'Andesite', 'Rhyolite', 'Obsidian', 'Pumice'],
    description: 'Rocks formed from volcanic eruptions.',
  },
  metamorphic: {
    rocks: ['Gneiss', 'Schist', 'Marble', 'Slate', 'Quartzite'],
    description: 'Rocks transformed by heat and pressure.',
  },
};

class USGSService {
  private static instance: USGSService;
  private baseUrl = 'https://mrdata.usgs.gov/geology/state/json';

  private constructor() {}

  static getInstance(): USGSService {
    if (!USGSService.instance) {
      USGSService.instance = new USGSService();
    }
    return USGSService.instance;
  }

  async getGeologicalFormation(latitude: number, longitude: number): Promise<USGSResponse> {
    try {
      const url = `${this.baseUrl}/${longitude},${latitude}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        return this.getFallbackFormation(latitude, longitude);
      }

      const data = await response.json();
      
      if (data && data.features && data.features.length > 0) {
        const feature = data.features[0];
        const props = feature.properties || {};

        return {
          formation: {
            unitName: props.unit_name || props.rocktype || 'Unknown Formation',
            unitAge: props.unit_age || props.age || 'Unknown Age',
            rockType: props.rocktype1 || props.rocktype || 'Unknown',
            lithology: props.lithology || props.lith1 || 'Unknown',
            description: props.unit_desc || props.description || 'No description available',
            source: 'USGS State Geologic Map Compilation',
          },
          rawData: data,
        };
      }

      return this.getFallbackFormation(latitude, longitude);
    } catch (error) {
      console.error('Error fetching USGS data:', error);
      return this.getFallbackFormation(latitude, longitude);
    }
  }

  private getFallbackFormation(latitude: number, longitude: number): USGSResponse {
    const region = this.determineRegion(latitude, longitude);
    
    return {
      formation: {
        unitName: region.formationName,
        unitAge: region.age,
        rockType: region.rockType,
        lithology: region.lithology,
        description: region.description,
        source: 'Regional estimation based on coordinates',
      },
      rawData: null,
    };
  }

  private determineRegion(latitude: number, longitude: number): {
    formationName: string;
    age: string;
    rockType: string;
    lithology: string;
    description: string;
  } {
    if (latitude > 35 && latitude < 42 && longitude > -115 && longitude < -105) {
      return {
        formationName: 'Colorado Plateau Formation',
        age: 'Mesozoic - Cenozoic',
        rockType: 'Sedimentary',
        lithology: 'Sandstone, Limestone, Shale',
        description: 'The Colorado Plateau is known for its stunning red rock formations, including sandstones, limestones, and shales deposited over millions of years.',
      };
    }
    
    if (latitude > 36 && latitude < 49 && longitude > -125 && longitude < -115) {
      return {
        formationName: 'Cascadia Volcanic Province',
        age: 'Cenozoic',
        rockType: 'Volcanic',
        lithology: 'Basalt, Andesite, Rhyolite',
        description: 'A region of volcanic activity with abundant basalt flows, volcanic cones, and igneous intrusions.',
      };
    }

    if (latitude > 25 && latitude < 35 && longitude > -85 && longitude < -75) {
      return {
        formationName: 'Atlantic Coastal Plain',
        age: 'Cenozoic - Mesozoic',
        rockType: 'Sedimentary',
        lithology: 'Sand, Clay, Limestone',
        description: 'Coastal deposits including marine sediments, beach sands, and carbonate rocks.',
      };
    }

    return {
      formationName: 'Unknown Regional Formation',
      age: 'Various',
      rockType: 'Mixed',
      lithology: 'Various rock types',
      description: 'This area contains diverse geological formations. Take a photo for AI-powered identification.',
    };
  }

  getRockSuggestions(formation: GeologicalFormation | null): { rocks: string[]; description: string } {
    if (!formation) {
      return FORMATION_ROCK_SUGGESTIONS.default;
    }

    const ageKey = this.normalizeAge(formation.unitAge);
    const rockTypeKey = this.normalizeRockType(formation.rockType);

    if (rockTypeKey && FORMATION_ROCK_SUGGESTIONS[rockTypeKey]) {
      return FORMATION_ROCK_SUGGESTIONS[rockTypeKey];
    }

    if (ageKey && FORMATION_ROCK_SUGGESTIONS[ageKey]) {
      return FORMATION_ROCK_SUGGESTIONS[ageKey];
    }

    return FORMATION_ROCK_SUGGESTIONS.default;
  }

  private normalizeAge(age: string): string | null {
    const ageLower = age.toLowerCase();
    
    if (ageLower.includes('quaternary') || ageLower.includes('holocene') || ageLower.includes('pleistocene')) {
      return 'quaternary';
    }
    if (ageLower.includes('tertiary') || ageLower.includes('neogene') || ageLower.includes('paleogene')) {
      return 'tertiary';
    }
    if (ageLower.includes('cretaceous')) return 'cretaceous';
    if (ageLower.includes('jurassic')) return 'jurassic';
    if (ageLower.includes('triassic')) return 'triassic';
    if (ageLower.includes('paleozoic') || ageLower.includes('permian') || ageLower.includes('carboniferous')) {
      return 'paleozoic';
    }
    if (ageLower.includes('precambrian') || ageLower.includes('archean') || ageLower.includes('proterozoic')) {
      return 'precambrian';
    }
    
    return null;
  }

  private normalizeRockType(rockType: string): string | null {
    const typeLower = rockType.toLowerCase();
    
    if (typeLower.includes('volcanic') || typeLower.includes('lava')) return 'volcanic';
    if (typeLower.includes('igneous') || typeLower.includes('intrusive') || typeLower.includes('plutonic')) return 'igneous';
    if (typeLower.includes('metamorphic')) return 'metamorphic';
    if (typeLower.includes('sediment')) return 'sedimentary';
    
    return null;
  }
}

export const usgsService = USGSService.getInstance();
export default usgsService;
