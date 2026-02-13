const METER_TO_FEET = 3.28084;

// Geological province bounding boxes with realistic depth-to-bedrock values
interface GeologicalProvince {
  name: string;
  north: number;
  south: number;
  east: number;
  west: number;
  maxDepthFeet: number;
}

const GEOLOGICAL_PROVINCES: GeologicalProvince[] = [
  // Central Texas / Balcones Fault Zone - shallow basement
  {
    name: 'Central Texas',
    north: 31.5,
    south: 29.0,
    west: -100.0,
    east: -97.0,
    maxDepthFeet: 6000,
  },
  // Texas Hill Country - very shallow basement
  {
    name: 'Texas Hill Country',
    north: 30.5,
    south: 29.5,
    west: -100.5,
    east: -98.0,
    maxDepthFeet: 4000,
  },
  // Deep Gulf Coast Basin - very deep sediments
  {
    name: 'Gulf Coast Basin',
    north: 30.0,
    south: 26.0,
    west: -99.0,
    east: -94.0,
    maxDepthFeet: 25000,
  },
  // Permian Basin - moderate depth
  {
    name: 'Permian Basin',
    north: 33.0,
    south: 31.0,
    west: -104.0,
    east: -100.5,
    maxDepthFeet: 12000,
  },
  // East Texas Basin
  {
    name: 'East Texas Basin',
    north: 33.5,
    south: 31.0,
    west: -96.5,
    east: -94.0,
    maxDepthFeet: 15000,
  },
  // Llano Uplift - exposed Precambrian
  {
    name: 'Llano Uplift',
    north: 31.0,
    south: 30.3,
    west: -99.0,
    east: -98.0,
    maxDepthFeet: 500,
  },
  // Colorado Plateau
  {
    name: 'Colorado Plateau',
    north: 40.0,
    south: 35.0,
    west: -114.0,
    east: -107.0,
    maxDepthFeet: 8000,
  },
  // Appalachian Basin
  {
    name: 'Appalachian Basin',
    north: 42.0,
    south: 35.0,
    west: -84.0,
    east: -75.0,
    maxDepthFeet: 10000,
  },
  // Williston Basin (North Dakota)
  {
    name: 'Williston Basin',
    north: 49.0,
    south: 45.0,
    west: -106.0,
    east: -97.0,
    maxDepthFeet: 16000,
  },
  // Michigan Basin
  {
    name: 'Michigan Basin',
    north: 46.0,
    south: 41.0,
    west: -88.0,
    east: -82.0,
    maxDepthFeet: 14000,
  },
  // Illinois Basin
  {
    name: 'Illinois Basin',
    north: 41.0,
    south: 37.0,
    west: -91.0,
    east: -86.0,
    maxDepthFeet: 8000,
  },
  // California Great Valley
  {
    name: 'Great Valley',
    north: 40.0,
    south: 35.0,
    west: -122.5,
    east: -119.0,
    maxDepthFeet: 20000,
  },
];

/**
 * Returns the maximum realistic depth to basement rock based on user's location.
 * Uses geological province data to provide accurate depth estimates.
 */
export function getMaxDepthForLocation(latitude: number, longitude: number): { maxDepthFeet: number; provinceName: string } {
  // Check each province (smaller/more specific provinces should be checked first if overlapping)
  for (const province of GEOLOGICAL_PROVINCES) {
    if (
      latitude < province.north &&
      latitude > province.south &&
      longitude < province.east &&
      longitude > province.west
    ) {
      return {
        maxDepthFeet: province.maxDepthFeet,
        provinceName: province.name,
      };
    }
  }
  
  // Default for unknown areas
  return {
    maxDepthFeet: 15000,
    provinceName: 'Unknown Province',
  };
}

const MAJOR_AQUIFERS = [
  'ogallala', 'edwards', 'floridan', 'carrizo', 'wilcox', 'carrizo-wilcox',
  'mahomet', 'dakota', 'kirkwood', 'cohansey', 'kirkwood-cohansey',
  'san joaquin', 'columbia plateau', 'snake river', 'high plains',
  'mississippi river valley', 'coastal lowlands', 'piedmont',
  'basin and range', 'central valley', 'alluvial', 'trinity',
  'gulf coast', 'surficial', 'biscayne', 'sparta', 'memphis sand',
  'winter garden', 'hueco bolson', 'pecos valley', 'roswell basin'
];

export function calculateAdaptiveHeight(thicknessMeters: number): number {
  const thicknessFeet = thicknessMeters * METER_TO_FEET;
  
  const minHeight = 70;
  const scaleFactor = 4.5;
  
  const height = minHeight + Math.sqrt(thicknessFeet) * scaleFactor;
  
  return height;
}

export function isKnownAquifer(formationName: string | undefined): boolean {
  if (!formationName) return false;
  const lowerCaseName = formationName.toLowerCase();
  return MAJOR_AQUIFERS.some(aq => lowerCaseName.includes(aq));
}

interface FormationFactResult {
  fact: string;
  category: 'volcanic' | 'marine' | 'terrestrial' | 'glacial' | 'aquifer' | 'fossil' | 'general';
}

const FORMATION_FACTS: Record<string, FormationFactResult> = {
  'tuff': {
    fact: "Formed from volcanic ash that settled and compacted over millions of years.",
    category: 'volcanic'
  },
  'basalt': {
    fact: "Erupted as lava flows, this dark rock is the most common volcanic rock on Earth.",
    category: 'volcanic'
  },
  'granite': {
    fact: "Crystallized slowly deep underground, creating the beautiful interlocking crystals visible in this rock.",
    category: 'volcanic'
  },
  'limestone': {
    fact: "Formed in warm, shallow seas from the shells of ancient marine creatures.",
    category: 'marine'
  },
  'chalk': {
    fact: "Made from billions of microscopic sea creatures called coccolithophores.",
    category: 'marine'
  },
  'shale': {
    fact: "Composed of ancient mud that settled in still water, often preserving delicate fossils.",
    category: 'marine'
  },
  'sandstone': {
    fact: "Ancient beach or desert sand, cemented together over millions of years.",
    category: 'terrestrial'
  },
  'conglomerate': {
    fact: "Rounded pebbles and gravel, often deposited by ancient rivers or glacial meltwaters.",
    category: 'terrestrial'
  },
  'mudstone': {
    fact: "Fine-grained sediment from ancient floodplains or lake beds.",
    category: 'terrestrial'
  },
  'siltstone': {
    fact: "Deposited in calm waters where fine particles slowly settled to the bottom.",
    category: 'marine'
  },
  'dolomite': {
    fact: "Originally limestone, chemically altered by magnesium-rich groundwater.",
    category: 'marine'
  },
  'coal': {
    fact: "The compressed remains of ancient swamp forests from 300 million years ago.",
    category: 'fossil'
  },
  'marl': {
    fact: "A mix of clay and carbonate, often rich in microfossils from ancient seas.",
    category: 'marine'
  },
  'gneiss': {
    fact: "Transformed by intense heat and pressure deep in Earth's crust, creating distinctive bands.",
    category: 'general'
  },
  'schist': {
    fact: "Metamorphosed under extreme conditions, often containing garnet or mica crystals.",
    category: 'general'
  },
  'quartzite': {
    fact: "Originally sandstone, now one of the hardest rocks due to metamorphic recrystallization.",
    category: 'general'
  },
  'marble': {
    fact: "Limestone transformed by heat into a prized building material used since ancient times.",
    category: 'general'
  },
  'slate': {
    fact: "Compressed shale that splits into thin sheets, historically used for roofing and writing tablets.",
    category: 'general'
  },
  'tillite': {
    fact: "Glacial debris frozen in time, evidence of ancient ice ages millions of years ago.",
    category: 'glacial'
  },
  'loess': {
    fact: "Wind-blown dust from ancient glacial outwash plains, creating fertile soil.",
    category: 'glacial'
  },
  'alluvium': {
    fact: "Recently deposited river sediments, constantly renewed by seasonal flooding.",
    category: 'terrestrial'
  },
  'clay': {
    fact: "Microscopic mineral particles that expand when wet, used in pottery for 25,000 years.",
    category: 'terrestrial'
  },
  'gravel': {
    fact: "Tumbled and rounded by flowing water over thousands of years of transport.",
    category: 'terrestrial'
  },
  'breccia': {
    fact: "Angular rock fragments, often from landslides or fault zones, frozen in time.",
    category: 'general'
  },
  'chert': {
    fact: "Silica-rich rock used by early humans to make tools and arrowheads.",
    category: 'marine'
  },
  'flint': {
    fact: "A type of chert prized by ancient peoples for making fire and sharp tools.",
    category: 'marine'
  },
  'phosphorite': {
    fact: "Rich in phosphorus from ancient marine life, now mined for fertilizer.",
    category: 'marine'
  },
  'evaporite': {
    fact: "Salt and mineral deposits left behind when ancient seas evaporated.",
    category: 'marine'
  },
  'gypsum': {
    fact: "Crystallized from evaporating seas, now used in drywall and plaster of Paris.",
    category: 'marine'
  },
  'halite': {
    fact: "Rock salt from ancient evaporated seas, sometimes miles thick underground.",
    category: 'marine'
  },
  'travertine': {
    fact: "Deposited by mineral-rich hot springs, creating beautiful terraced formations.",
    category: 'general'
  },
  'peat': {
    fact: "Partially decomposed plant matter, the first stage in coal formation.",
    category: 'fossil'
  },
  'oil shale': {
    fact: "Contains kerogen, the organic precursor to oil, locked in ancient marine sediments.",
    category: 'fossil'
  },
  'cretaceous': {
    fact: "From the age of dinosaurs, when seas covered much of what is now land.",
    category: 'fossil'
  },
  'jurassic': {
    fact: "Formed when giant dinosaurs roamed and the first birds took flight.",
    category: 'fossil'
  },
  'triassic': {
    fact: "From the dawn of the dinosaur age, after Earth's greatest mass extinction.",
    category: 'fossil'
  },
  'permian': {
    fact: "Before the dinosaurs, when reptiles first dominated the land.",
    category: 'fossil'
  },
  'carboniferous': {
    fact: "The age of coal forests, when giant insects filled the oxygen-rich air.",
    category: 'fossil'
  },
  'devonian': {
    fact: "The age of fishes, when life first ventured onto land.",
    category: 'fossil'
  },
  'silurian': {
    fact: "When the first plants colonized the land and coral reefs flourished.",
    category: 'fossil'
  },
  'ordovician': {
    fact: "Ancient seas teemed with trilobites and the first jawed fish appeared.",
    category: 'fossil'
  },
  'cambrian': {
    fact: "The explosion of complex life, when most major animal groups first appeared.",
    category: 'fossil'
  },
  'precambrian': {
    fact: "Earth's earliest rocks, from when only simple life forms existed.",
    category: 'general'
  },
  'pleistocene': {
    fact: "The Ice Ages, when mammoths and saber-toothed cats roamed North America.",
    category: 'glacial'
  },
  'miocene': {
    fact: "When grasslands spread and horses, dogs, and apes evolved rapidly.",
    category: 'fossil'
  },
  'oligocene': {
    fact: "Cooler climates drove the evolution of many modern mammal families.",
    category: 'fossil'
  },
  'eocene': {
    fact: "A greenhouse world with crocodiles in the Arctic and early whales in the seas.",
    category: 'fossil'
  },
  'paleocene': {
    fact: "The recovery period after the dinosaur extinction, when mammals began to diversify.",
    category: 'fossil'
  },
  'edwards': {
    fact: "One of the most productive aquifers in the world, supplying water to millions in Texas.",
    category: 'aquifer'
  },
  'ogallala': {
    fact: "The Great Plains' lifeline, an ancient aquifer that took millions of years to fill.",
    category: 'aquifer'
  },
  'carrizo': {
    fact: "Crystal-clear water flows through ancient beach sands from the Eocene epoch.",
    category: 'aquifer'
  },
  'wilcox': {
    fact: "Formed when the Gulf Coast was a tropical paradise 50 million years ago.",
    category: 'aquifer'
  },
  'floridan': {
    fact: "One of the world's most productive aquifers, feeding Florida's famous springs.",
    category: 'aquifer'
  },
  'trinity': {
    fact: "Ancient Cretaceous sands providing water to the Texas Hill Country.",
    category: 'aquifer'
  },
  'lagarto': {
    fact: "Ancient coastal plain deposits from when the Gulf of Mexico extended much further inland.",
    category: 'marine'
  },
  'oakville': {
    fact: "Sandy deposits from an ancient shoreline, rich in fossil shells and shark teeth.",
    category: 'marine'
  },
  'navarro': {
    fact: "Late Cretaceous marine deposits, laid down in the final days of the dinosaurs.",
    category: 'fossil'
  },
  'austin': {
    fact: "Chalk cliffs from an ancient sea, sometimes containing ammonite fossils.",
    category: 'marine'
  },
  'taylor': {
    fact: "Marine clays from the Western Interior Seaway that once split North America.",
    category: 'marine'
  },
  'del rio': {
    fact: "Dark clay deposited in a warm, shallow sea about 100 million years ago.",
    category: 'marine'
  },
  'georgetown': {
    fact: "Dense limestone that forms the cap of the famous Edwards Aquifer.",
    category: 'marine'
  },
  'glen rose': {
    fact: "Contains famous dinosaur tracks preserved in ancient tidal flats.",
    category: 'fossil'
  },
  'pearsall': {
    fact: "Deep marine deposits from when Central Texas was covered by a warm sea.",
    category: 'marine'
  },
  'hosston': {
    fact: "Ancient river and delta sands, an important water source in East Texas.",
    category: 'terrestrial'
  },
  'sligo': {
    fact: "Early Cretaceous carbonate deposits from a shallow tropical sea.",
    category: 'marine'
  },
  'cook mountain': {
    fact: "Fossiliferous marine clays from a warm Eocene sea, rich in gastropod shells.",
    category: 'marine'
  },
  'sparta': {
    fact: "A major Gulf Coast aquifer, these sands were deposited in a tropical delta system.",
    category: 'aquifer'
  },
  'weches': {
    fact: "Glauconitic marine sediments, their green color comes from iron-rich minerals.",
    category: 'marine'
  },
  'queen city': {
    fact: "Beach and nearshore sands from when Texas had a subtropical coastline.",
    category: 'terrestrial'
  },
  'reklaw': {
    fact: "Marine clays and sands deposited during a warm period 50 million years ago.",
    category: 'marine'
  },
  'mount selman': {
    fact: "Ancient coastal plain deposits with lignite coal from subtropical swamps.",
    category: 'fossil'
  },
  'yegua': {
    fact: "Delta and coastal deposits containing fossilized palm fronds and sea shells.",
    category: 'marine'
  },
  'jackson': {
    fact: "Late Eocene marine sediments marking the end of widespread Gulf Coast seas.",
    category: 'marine'
  },
  'claiborne': {
    fact: "Named for a parish in Louisiana, these diverse sediments tell of ancient coastlines.",
    category: 'marine'
  },
  'midway': {
    fact: "Some of the first sediments after the dinosaur extinction, rich in early mammal fossils.",
    category: 'fossil'
  },
  'kincaid': {
    fact: "Paleocene marine deposits from the recovery period after the K-T extinction.",
    category: 'fossil'
  },
  'wills point': {
    fact: "Dark marine clays deposited in deep water during the Paleocene epoch.",
    category: 'marine'
  },
  'eagle ford': {
    fact: "One of the most productive shale oil and gas plays in the world.",
    category: 'fossil'
  },
  'buda': {
    fact: "A dense, hard limestone that forms a key marker bed for geologists in Texas.",
    category: 'marine'
  },
  'travis peak': {
    fact: "A thick sequence of sand and conglomerate from ancient river and delta deposits.",
    category: 'terrestrial'
  },
  'pecos': {
    fact: "Named for the Pecos River, these sediments chronicle millions of years of Texas history.",
    category: 'terrestrial'
  },
  'fredericksburg': {
    fact: "Cretaceous limestone and marl forming the scenic Texas Hill Country landscape.",
    category: 'marine'
  },
  'comanche': {
    fact: "A series of limestone formations that hold the key to understanding Texas' Cretaceous past.",
    category: 'marine'
  },
  'washita': {
    fact: "Shallow marine deposits that record fluctuating sea levels 100 million years ago.",
    category: 'marine'
  },
  'kiamichi': {
    fact: "Dark marine shales containing well-preserved ammonite fossils.",
    category: 'fossil'
  },
  'duck creek': {
    fact: "Fossiliferous limestone from a warm Cretaceous sea full of oysters and clams.",
    category: 'marine'
  },
  'paluxy': {
    fact: "Famous for preserving some of the best dinosaur trackways in North America.",
    category: 'fossil'
  },
  'antlers': {
    fact: "Ancient coastal sands containing dinosaur bones and fossilized wood.",
    category: 'fossil'
  },
  'hensel': {
    fact: "Sandy limestone from the shoreline of an ancient Cretaceous sea.",
    category: 'marine'
  },
  'cow creek': {
    fact: "Limestone rich in oyster fossils from a shallow tropical lagoon.",
    category: 'marine'
  },
  'hammett': {
    fact: "Dark shales representing a brief deepening of ancient Texas seas.",
    category: 'marine'
  },
  'hensell': {
    fact: "Sandy deposits from rivers flowing into the early Cretaceous sea.",
    category: 'terrestrial'
  },
  'sycamore': {
    fact: "Limestone named after Sycamore Creek, containing diverse marine fossils.",
    category: 'marine'
  },
  'barnett': {
    fact: "A major shale gas reservoir that revolutionized American energy production.",
    category: 'fossil'
  },
  'woodbine': {
    fact: "Delta sands from when rivers built out into the Western Interior Seaway.",
    category: 'terrestrial'
  },
  'blossom': {
    fact: "Sandy marine deposits from the retreating Late Cretaceous sea.",
    category: 'marine'
  },
  'bonham': {
    fact: "Dark Cretaceous marls deposited in quiet, oxygen-poor waters.",
    category: 'marine'
  },
  'ector': {
    fact: "Chalky marls from a shallow sea that once covered much of Texas.",
    category: 'marine'
  },
  'annona': {
    fact: "Chalk deposits containing microscopic fossils of ancient plankton.",
    category: 'marine'
  },
  'ozan': {
    fact: "Marine clays and sands from the final stages of Cretaceous seas in Texas.",
    category: 'marine'
  },
  'nacatoch': {
    fact: "Sandy marine deposits marking the end of the dinosaur era in this region.",
    category: 'marine'
  },
  'escondido': {
    fact: "Shallow marine sands containing fossils of late Cretaceous sea life.",
    category: 'marine'
  },
  'olmos': {
    fact: "Coal-bearing deposits from coastal swamps near the ancient shoreline.",
    category: 'fossil'
  },
  'san miguel': {
    fact: "Sandy marine sediments from a prograding shoreline system.",
    category: 'marine'
  },
  'upson': {
    fact: "Dark marine clays deposited in a quiet offshore environment.",
    category: 'marine'
  },
  'anacacho': {
    fact: "Volcanic tuff and limestone from an ancient volcanic island chain.",
    category: 'volcanic'
  }
};

// Epoch/period keywords that should only match as fallback
const EPOCH_KEYWORDS = [
  'cretaceous', 'jurassic', 'triassic', 'permian', 'carboniferous',
  'devonian', 'silurian', 'ordovician', 'cambrian', 'precambrian',
  'pleistocene', 'miocene', 'oligocene', 'eocene', 'paleocene',
  'holocene', 'pliocene', 'quaternary', 'tertiary', 'paleogene', 'neogene'
];

export function getFormationFact(formationName: string | undefined, epoch?: string): FormationFactResult {
  if (!formationName) {
    return {
      fact: "A unique geological layer with a rich history waiting to be discovered.",
      category: 'general'
    };
  }

  const lowerName = formationName.toLowerCase();
  const lowerEpoch = epoch?.toLowerCase() || '';

  // Step 1: Check for formation-specific keywords FIRST (non-epoch matches)
  for (const [key, value] of Object.entries(FORMATION_FACTS)) {
    // Skip epoch keywords in this first pass - we want formation-specific facts
    if (EPOCH_KEYWORDS.includes(key)) continue;
    
    if (lowerName.includes(key)) {
      return value;
    }
  }

  // Step 2: Check if it's a known aquifer
  if (isKnownAquifer(formationName)) {
    return {
      fact: "Part of a major aquifer system, providing groundwater to the region.",
      category: 'aquifer'
    };
  }

  // Step 3: Check for sand/gravel in name
  if (lowerName.includes('sand') || lowerName.includes('gravel')) {
    return {
      fact: "Sediments deposited by ancient rivers or coastal processes.",
      category: 'terrestrial'
    };
  }

  // Step 4: Check for marine indicators in name
  if (lowerName.includes('marine') || lowerName.includes('sea') || lowerName.includes('reef')) {
    return {
      fact: "Deposited in ancient seas that once covered this region.",
      category: 'marine'
    };
  }

  // Step 5: FALLBACK to epoch-based facts only after formation-specific checks fail
  for (const epochKey of EPOCH_KEYWORDS) {
    if (lowerEpoch.includes(epochKey) && FORMATION_FACTS[epochKey]) {
      return FORMATION_FACTS[epochKey];
    }
  }

  return {
    fact: "A unique geological layer with a rich history waiting to be discovered.",
    category: 'general'
  };
}

export function formatFeetMeasurement(feet: number): string {
  if (feet >= 1000) {
    return `${(feet / 1000).toFixed(1)}k ft`;
  }
  return `${Math.round(feet)} ft`;
}

export interface StratigraphicLayer {
  unit_name?: string;
  lith?: string;
  t_age?: number;
  b_age?: number;
}

export function isBedrock(layer: StratigraphicLayer): boolean {
  if (!layer) return false;

  // Check 1: Age (Precambrian is older than ~541 million years)
  const age = layer.b_age || layer.t_age;
  if (age && age > 541) {
    return true;
  }

  // Check 2: Lithology Keywords
  const lithology = (layer.lith || '').toLowerCase();
  const bedrockLithologies = [
    'igneous', 'metamorphic', 'crystalline', 'granite', 'gneiss', 
    'schist', 'quartzite', 'marble', 'slate', 'phyllite',
    'amphibolite', 'hornfels', 'migmatite'
  ];
  if (bedrockLithologies.some(keyword => lithology.includes(keyword))) {
    return true;
  }
  
  // Check 3: Formation Name Keywords
  const name = (layer.unit_name || '').toLowerCase();
  const bedrockNames = ['basement', 'precambrian', 'crystalline', 'shield', 'craton'];
  if (bedrockNames.some(keyword => name.includes(keyword))) {
    return true;
  }

  return false;
}

export function metersToFeet(meters: number): number {
  return meters * METER_TO_FEET;
}

interface LithologyEntry {
  name: string;
  type: string;
  class: string;
  prop: number;
}

export function getRockHardness(lithArray: LithologyEntry[], lithString: string): number {
  // Define hardness mapping by primary lithology name
  const hardnessMap: Record<string, number> = {
    // Hardness 10 - Hardest
    'quartzite': 10,
    'chert': 10,
    'flint': 10,
    // Hardness 9
    'granite': 9,
    'gneiss': 9,
    'basalt': 9,
    'rhyolite': 9,
    'andesite': 9,
    'diorite': 9,
    'gabbro': 9,
    // Hardness 8
    'marble': 8,
    'hornfels': 8,
    'amphibolite': 8,
    // Hardness 7
    'limestone': 7,
    'dolomite': 7,
    'dolostone': 7,
    // Hardness 6
    'sandstone': 6,
    'greywacke': 6,
    'arkose': 6,
    'conglomerate': 6,
    'breccia': 6,
    // Hardness 5
    'siltstone': 5,
    'mudstone': 5,
    'marl': 5,
    'chalk': 5,
    // Hardness 4
    'shale': 4,
    'slate': 4,
    'phyllite': 4,
    'schist': 4,
    // Hardness 3
    'clay': 3,
    // Hardness 2
    'sand': 2,
    'gravel': 2,
    'alluvium': 2,
    'loess': 2,
    'till': 2,
    'peat': 2,
    'coal': 2,
    'lignite': 2,
    // Hardness 1
    'soil': 1,
    'fill': 1,
    'overburden': 1,
  };

  // Try primary lithology from lithArray first (highest prop)
  if (lithArray && lithArray.length > 0) {
    const primary = lithArray[0]; // Already sorted by prop in descending order
    const primaryName = primary.name.toLowerCase();
    
    // Check for exact match
    if (hardnessMap[primaryName]) {
      return hardnessMap[primaryName];
    }
    
    // Special case: mudstone hardness depends on sedimentary + siliciclastic classification
    if (primaryName.includes('mudstone') && primary.class === 'sedimentary' && primary.type === 'siliciclastic') {
      return 3;
    }
  }

  // Fallback to lithString keyword matching
  if (lithString) {
    const lowerLithString = lithString.toLowerCase();
    for (const [keyword, hardness] of Object.entries(hardnessMap)) {
      if (lowerLithString.includes(keyword)) {
        return hardness;
      }
    }
  }

  // Default to 5
  return 5;
}

export function getLayerWidth(hardness: number, maxWidth: number = 1.0): number {
  const widthMap: Record<number, number> = {
    10: 1.0,
    9: 0.95,
    8: 0.88,
    7: 0.82,
    6: 0.75,
    5: 0.68,
    4: 0.60,
    3: 0.52,
    2: 0.45,
    1: 0.40,
  };

  // Ensure hardness is within valid range
  const clampedHardness = Math.max(1, Math.min(10, Math.round(hardness)));
  const widthFactor = widthMap[clampedHardness] || 0.68;
  
  return maxWidth * widthFactor;
}

export function getPrimaryLithology(lithArray: LithologyEntry[], lithString: string): string {
  // Get primary lithology from lithArray (highest prop)
  if (lithArray && lithArray.length > 0) {
    const primary = lithArray[0]; // Already sorted by prop in descending order
    return primary.name.charAt(0).toUpperCase() + primary.name.slice(1);
  }

  // Parse from lithString if available
  if (lithString) {
    // Split by comma and take the first one
    const parts = lithString.split(',');
    const firstPart = parts[0].trim();
    return firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
  }

  return 'Unknown';
}

interface BoundaryUnit {
  t_age?: number;
  b_age?: number;
  lith?: string;
  unit_name?: string;
}

interface BoundaryResult {
  type: 'kt' | 'permian-triassic' | 'great-unconformity' | 'major-unconformity' | 'none';
  label: string;
  color: string;
  age: number;
}

export function detectBoundaryType(unitAbove: BoundaryUnit, unitBelow: BoundaryUnit): BoundaryResult {
  if (!unitAbove || !unitBelow) {
    return { type: 'none', label: 'No Boundary', color: '#999999', age: 0 };
  }

  // Get the boundary age (top of lower unit or bottom of upper unit)
  const ageGap = Math.abs((unitBelow.t_age || 0) - (unitAbove.b_age || 0));
  const boundaryAge = unitBelow.t_age || 0;

  // K-Pg boundary: ~66 Ma
  if (Math.abs(ageGap - 66) < 5) {
    return { 
      type: 'kt', 
      label: 'K-Pg Boundary', 
      color: '#FF6B6B', 
      age: boundaryAge 
    };
  }

  // Permian-Triassic boundary: ~252 Ma
  if (Math.abs(ageGap - 252) < 10) {
    return { 
      type: 'permian-triassic', 
      label: 'Permian-Triassic Boundary (The Great Dying)', 
      color: '#FF4500', 
      age: boundaryAge 
    };
  }

  // Great Unconformity: Cambrian on Precambrian (gap > 541 Ma)
  const unitAboveLower = (unitAbove.unit_name || '').toLowerCase();
  const unitBelowLower = (unitBelow.unit_name || '').toLowerCase();
  
  const isCambrianAbove = unitAboveLower.includes('cambrian');
  const isPrecambrianBelow = unitBelowLower.includes('precambrian') || (unitBelow.b_age || 0) > 541;
  
  if (isCambrianAbove && isPrecambrianBelow && ageGap > 541) {
    return { 
      type: 'great-unconformity', 
      label: 'Great Unconformity', 
      color: '#8B4513', 
      age: boundaryAge 
    };
  }

  // Major unconformity: time gap > 50 Ma
  if (ageGap > 50) {
    return { 
      type: 'major-unconformity', 
      label: 'Major Unconformity', 
      color: '#D2691E', 
      age: boundaryAge 
    };
  }

  return { type: 'none', label: 'No Boundary', color: '#999999', age: boundaryAge };
}

type PatternType = 'brick' | 'dots' | 'dashes' | 'vlines' | 'crosses' | 'waves' | 'triangles' | 'circles' | 'solid';

export function getLithologyPatternType(lithArray: LithologyEntry[], lithString: string): PatternType {
  // Get primary lithology name
  const primaryLith = getPrimaryLithology(lithArray, lithString).toLowerCase();

  // Brick pattern: limestone/dolomite
  if (primaryLith.includes('limestone') || primaryLith.includes('dolomite') || primaryLith.includes('dolostone')) {
    return 'brick';
  }

  // Dots pattern: sandstone/conglomerate
  if (primaryLith.includes('sandstone') || primaryLith.includes('conglomerate') || primaryLith.includes('arkose') || primaryLith.includes('greywacke')) {
    return 'dots';
  }

  // Dashes pattern: shale/clay
  if (primaryLith.includes('shale') || primaryLith.includes('clay')) {
    return 'dashes';
  }

  // Vlines pattern: siltstone/mudstone
  if (primaryLith.includes('siltstone') || primaryLith.includes('mudstone')) {
    return 'vlines';
  }

  // Crosses pattern: igneous rocks
  if (primaryLith.includes('granite') || primaryLith.includes('basalt') || primaryLith.includes('rhyolite') || 
      primaryLith.includes('andesite') || primaryLith.includes('diorite') || primaryLith.includes('gabbro') ||
      primaryLith.includes('igneous')) {
    return 'crosses';
  }

  // Waves pattern: metamorphic rocks
  if (primaryLith.includes('gneiss') || primaryLith.includes('schist') || primaryLith.includes('phyllite') || 
      primaryLith.includes('slate') || primaryLith.includes('marble') || primaryLith.includes('hornfels') || 
      primaryLith.includes('amphibolite') || primaryLith.includes('metamorphic')) {
    return 'waves';
  }

  // Triangles pattern: volcanic/tuff
  if (primaryLith.includes('tuff') || primaryLith.includes('volcanic')) {
    return 'triangles';
  }

  // Circles pattern: gravel/alluvium
  if (primaryLith.includes('gravel') || primaryLith.includes('alluvium')) {
    return 'circles';
  }

  // Default: solid
  return 'solid';
}
