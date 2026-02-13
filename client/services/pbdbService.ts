const PBDB_API_BASE = 'https://paleobiodb.org/data1.2';

export interface FossilOccurrence {
  collection_no: number;
  collection_name: string;
  lng: number;
  lat: number;
  early_interval: string;
  late_interval: string;
  max_ma: number;
  min_ma: number;
  formation: string;
  lithology1: string;
  reference_no: number;
  n_occs: number;
}

export interface FossilTaxon {
  taxon_name: string;
  taxon_rank: string;
  common_name?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  description?: string;
}

export interface FossilSite {
  collectionId: number;
  name: string;
  distance: number;
  formation: string;
  age: string;
  fossils: SimplifiedFossil[];
  environment?: string;
  lithology?: string;
}

export interface SimplifiedFossil {
  name: string;
  scientificName: string;
  description: string;
  type: string;
}

const FOSSIL_DESCRIPTIONS: Record<string, { description: string; type: string }> = {
  bivalvia: { description: 'Ancient clams and mussels that lived in rivers, lakes, or shallow seas.', type: 'Shellfish' },
  gastropoda: { description: 'Snails and slugs that inhabited freshwater or marine environments.', type: 'Snails' },
  plantae: { description: 'Petrified plant material, often wood or leaves from ancient forests.', type: 'Plants' },
  vertebrata: { description: 'Bones, teeth, or scales from ancient animals with backbones.', type: 'Vertebrates' },
  cephalopoda: { description: 'Ancient squid relatives including ammonites and nautiloids.', type: 'Cephalopods' },
  echinodermata: { description: 'Sea urchins, starfish, and crinoids from ancient oceans.', type: 'Echinoderms' },
  brachiopoda: { description: 'Shell-bearing marine animals that superficially resemble clams.', type: 'Brachiopods' },
  trilobita: { description: 'Extinct marine arthropods that dominated ancient seas.', type: 'Trilobites' },
  arthropoda: { description: 'Ancient insects, crustaceans, or other joint-legged creatures.', type: 'Arthropods' },
  coral: { description: 'Colonial marine organisms that built ancient reef structures.', type: 'Corals' },
  foraminifera: { description: 'Tiny single-celled organisms with intricate shells.', type: 'Microfossils' },
  mammalia: { description: 'Ancient mammals including early horses, camels, and elephants.', type: 'Mammals' },
  reptilia: { description: 'Turtles, crocodiles, lizards, or their ancient relatives.', type: 'Reptiles' },
  pisces: { description: 'Fish remains including scales, teeth, and bones.', type: 'Fish' },
  amphibia: { description: 'Ancient frogs, salamanders, or their primitive relatives.', type: 'Amphibians' },
  aves: { description: 'Ancient bird remains or their dinosaur ancestors.', type: 'Birds' },
  dinosauria: { description: 'Dinosaur bones, teeth, or footprints.', type: 'Dinosaurs' },
};

function getSimpleFossilInfo(taxonName: string, phylum?: string, className?: string): SimplifiedFossil {
  const nameLower = taxonName.toLowerCase();
  const phylumLower = (phylum || '').toLowerCase();
  const classLower = (className || '').toLowerCase();

  for (const [key, info] of Object.entries(FOSSIL_DESCRIPTIONS)) {
    if (nameLower.includes(key) || phylumLower.includes(key) || classLower.includes(key)) {
      return {
        name: info.type,
        scientificName: taxonName,
        description: info.description,
        type: info.type,
      };
    }
  }

  if (classLower.includes('bivalv') || nameLower.includes('clam') || nameLower.includes('oyster')) {
    return { name: 'Clams', scientificName: taxonName, description: 'Ancient shellfish that lived in water.', type: 'Shellfish' };
  }
  if (classLower.includes('gastropod') || nameLower.includes('snail')) {
    return { name: 'Snails', scientificName: taxonName, description: 'Ancient snails from rivers or seas.', type: 'Snails' };
  }

  return {
    name: taxonName.split(' ')[0],
    scientificName: taxonName,
    description: 'An ancient organism preserved in rock.',
    type: 'Fossil',
  };
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

class PBDBService {
  async getFossilsNearFormation(
    lat: number,
    lng: number,
    formationName: string,
    minAge?: number,
    maxAge?: number,
    radiusMiles: number = 50
  ): Promise<FossilSite[]> {
    try {
      const radiusKm = radiusMiles * 1.60934;
      
      let url = `${PBDB_API_BASE}/colls/list.json?lngmin=${lng - 1}&lngmax=${lng + 1}&latmin=${lat - 1}&latmax=${lat + 1}&show=ref,time,strat,geo,litho`;
      
      if (formationName && formationName.length > 3) {
        const cleanFormation = formationName.replace(/\s+(Formation|Member|Group|Tuff|Sandstone|Limestone|Shale)$/i, '').trim();
        url += `&base_name=${encodeURIComponent(cleanFormation)}`;
      }
      
      if (minAge && maxAge) {
        url += `&min_ma=${minAge}&max_ma=${maxAge}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`PBDB API error: ${response.status}`);
      }

      const data = await response.json();
      const records = data.records || [];

      if (records.length === 0) {
        const fallbackUrl = `${PBDB_API_BASE}/colls/list.json?lngmin=${lng - 0.5}&lngmax=${lng + 0.5}&latmin=${lat - 0.5}&latmax=${lat + 0.5}&show=ref,time,strat,geo,litho`;
        const fallbackResponse = await fetch(fallbackUrl);
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          records.push(...(fallbackData.records || []));
        }
      }

      const sites: FossilSite[] = [];

      for (const record of records.slice(0, 10)) {
        const distance = calculateDistance(lat, lng, record.lat, record.lng);
        if (distance > radiusMiles) continue;

        const fossils = await this.getCollectionTaxa(record.collection_no);

        sites.push({
          collectionId: record.collection_no,
          name: record.collection_name || record.cxn || 'Fossil Site',
          distance: Math.round(distance * 10) / 10,
          formation: record.formation || 'Unknown Formation',
          age: `${record.early_interval || ''} - ${record.late_interval || ''}`.trim() || 'Unknown Age',
          fossils: fossils.slice(0, 5),
          environment: record.environment || undefined,
          lithology: record.lithology1 || undefined,
        });
      }

      sites.sort((a, b) => a.distance - b.distance);
      return sites.slice(0, 5);
    } catch (error) {
      console.error('PBDB API error:', error);
      return [];
    }
  }

  private async getCollectionTaxa(collectionNo: number): Promise<SimplifiedFossil[]> {
    try {
      const url = `${PBDB_API_BASE}/occs/list.json?coll_id=${collectionNo}&show=phylo,class`;
      const response = await fetch(url);
      
      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const records = data.records || [];

      const fossilMap = new Map<string, SimplifiedFossil>();

      for (const occ of records) {
        const info = getSimpleFossilInfo(occ.tna || occ.taxon_name || 'Unknown', occ.phl, occ.cll);
        if (!fossilMap.has(info.type)) {
          fossilMap.set(info.type, info);
        }
      }

      return Array.from(fossilMap.values());
    } catch (error) {
      console.error('Error fetching taxa:', error);
      return [];
    }
  }

  getDefaultFossils(lithology: string, environment: string): SimplifiedFossil[] {
    const fossils: SimplifiedFossil[] = [];
    const lith = lithology.toLowerCase();
    const env = environment.toLowerCase();

    if (lith.includes('limestone') || env.includes('marine') || env.includes('reef')) {
      fossils.push({
        name: 'Marine Shells',
        scientificName: 'Various bivalves and gastropods',
        description: 'Shells from ancient sea creatures that lived when this area was underwater.',
        type: 'Shellfish',
      });
      fossils.push({
        name: 'Corals',
        scientificName: 'Anthozoa',
        description: 'Remains of ancient reef-building organisms.',
        type: 'Corals',
      });
    }

    if (lith.includes('sandstone') || env.includes('fluvial') || env.includes('river')) {
      fossils.push({
        name: 'Petrified Wood',
        scientificName: 'Various gymnosperms and angiosperms',
        description: 'Ancient trees that turned to stone, preserving their woody structure.',
        type: 'Plants',
      });
      fossils.push({
        name: 'Freshwater Clams',
        scientificName: 'Unionidae',
        description: 'Evidence of ancient rivers and streams that once flowed here.',
        type: 'Shellfish',
      });
    }

    if (lith.includes('shale') || lith.includes('mudstone')) {
      fossils.push({
        name: 'Plant Impressions',
        scientificName: 'Various flora',
        description: 'Delicate imprints of leaves, stems, and seeds from ancient plants.',
        type: 'Plants',
      });
    }

    if (env.includes('deltaic') || env.includes('coastal')) {
      fossils.push({
        name: 'Turtle Shells',
        scientificName: 'Testudines',
        description: 'Remains of turtles that lived in the coastal wetlands.',
        type: 'Reptiles',
      });
    }

    if (fossils.length === 0) {
      fossils.push({
        name: 'Trace Fossils',
        scientificName: 'Ichnofossils',
        description: 'Burrows, tracks, or other evidence of ancient life activity.',
        type: 'Trace Fossils',
      });
    }

    return fossils;
  }
}

export const pbdbService = new PBDBService();
