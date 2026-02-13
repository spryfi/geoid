const MACROSTRAT_API_BASE = 'https://macrostrat.org/api/v2';

export interface LithologyEntry {
  name: string;
  type: string;
  class: string;
  prop: number;
  lith_id?: number;
}

export interface EnvironEntry {
  name: string;
  type: string;
  class: string;
}

export interface StratigraphicUnit {
  unit_id: number;
  unit_name: string;
  strat_name_long: string;
  color: string;
  t_age: number;
  b_age: number;
  max_thick: number;
  min_thick: number;
  lith: string;
  lithArray: LithologyEntry[];
  environ: string;
  environArray: EnvironEntry[];
  pbdb_collections: number;
  col_id: number;
  outcrop: string;
  econ: string;
  notes: string;
  t_int_name: string;
  b_int_name: string;
  Fm: string;
  Gp: string;
  clat: number;
  clng: number;
}

export interface StratigraphicColumn {
  col_id: number;
  col_name: string;
  col_group: string;
  units: StratigraphicUnit[];
  totalThickness: number;
  ageRange: { min: number; max: number };
}

export interface MacrostratResponse {
  success: {
    v: number;
    data: any[];
  };
}

class MacrostratService {
  async getStratigraphicColumn(lat: number, lng: number): Promise<StratigraphicColumn | null> {
    try {
      const unitsUrl = `${MACROSTRAT_API_BASE}/units?lat=${lat}&lng=${lng}&response=long&format=json`;
      const response = await fetch(unitsUrl);
      
      if (!response.ok) {
        throw new Error(`Macrostrat API error: ${response.status}`);
      }

      const data: MacrostratResponse = await response.json();
      
      if (!data.success || !data.success.data || data.success.data.length === 0) {
        return null;
      }

      const units: StratigraphicUnit[] = data.success.data.map((unit: any) => ({
        unit_id: unit.unit_id,
        unit_name: unit.unit_name || unit.strat_name_long || 'Unknown Unit',
        strat_name_long: unit.strat_name_long || unit.unit_name || 'Unknown',
        color: unit.color || '#808080',
        t_age: unit.t_age || 0,
        b_age: unit.b_age || 0,
        max_thick: unit.max_thick || 0,
        min_thick: unit.min_thick || 0,
        lith: this.formatLithology(unit.lith),
        lithArray: this.parseLithArray(unit.lith),
        environ: this.formatEnvironment(unit.environ),
        environArray: this.parseEnvironArray(unit.environ),
        pbdb_collections: unit.pbdb_collections || 0,
        col_id: unit.col_id,
        outcrop: unit.outcrop || '',
        econ: this.formatEcon(unit.econ),
        notes: unit.notes || '',
        t_int_name: unit.t_int_name || '',
        b_int_name: unit.b_int_name || '',
        Fm: unit.Fm || '',
        Gp: unit.Gp || '',
        clat: unit.clat || lat,
        clng: unit.clng || lng,
      }));

      units.sort((a, b) => a.t_age - b.t_age);

      const totalThickness = units.reduce((sum, unit) => sum + (unit.max_thick || 0), 0);
      const ages = units.map(u => [u.t_age, u.b_age]).flat().filter(a => a > 0);
      const ageRange = {
        min: Math.min(...ages, 0),
        max: Math.max(...ages, 0),
      };

      const firstUnit = data.success.data[0];
      
      return {
        col_id: firstUnit.col_id || 0,
        col_name: firstUnit.col_name || 'Local Column',
        col_group: firstUnit.col_group || 'Regional',
        units,
        totalThickness,
        ageRange,
      };
    } catch (error) {
      console.error('Macrostrat API error:', error);
      return null;
    }
  }

  private parseLithArray(lith: any): LithologyEntry[] {
    if (!lith || !Array.isArray(lith)) return [];
    return lith.map((l: any) => ({
      name: l.name || 'unknown',
      type: l.type || 'unknown',
      class: l.class || 'unknown',
      prop: l.prop || 0,
      lith_id: l.lith_id,
    })).sort((a: LithologyEntry, b: LithologyEntry) => b.prop - a.prop);
  }

  private parseEnvironArray(environ: any): EnvironEntry[] {
    if (!environ || !Array.isArray(environ)) return [];
    return environ.map((e: any) => ({
      name: e.name || 'unknown',
      type: e.type || '',
      class: e.class || '',
    }));
  }

  private formatLithology(lith: any): string {
    if (!lith) return 'Unknown';
    if (typeof lith === 'string') return lith;
    if (Array.isArray(lith)) {
      return lith.map((l: any) => l.name || l.lith || l).join(', ');
    }
    if (typeof lith === 'object' && lith.name) {
      return lith.name;
    }
    return 'Mixed';
  }

  private formatEnvironment(environ: any): string {
    if (!environ) return 'Unknown';
    if (typeof environ === 'string') return environ;
    if (Array.isArray(environ)) {
      return environ.map((e: any) => e.name || e.environ || e).join(', ');
    }
    if (typeof environ === 'object' && environ.name) {
      return environ.name;
    }
    return 'Varied';
  }

  private formatEcon(econ: any): string {
    if (!econ) return '';
    if (typeof econ === 'string') return econ;
    if (Array.isArray(econ)) {
      return econ.map((e: any) => e.name || e.econ || e).join(', ');
    }
    return '';
  }

  formatAge(age: number): string {
    if (age === 0) return 'Present';
    if (age < 1) return `${(age * 1000).toFixed(0)} Ka`;
    if (age < 1000) return `${age.toFixed(1)} Ma`;
    return `${(age / 1000).toFixed(2)} Ga`;
  }

  getGeologicPeriod(age: number): string {
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
}

export const macrostratService = new MacrostratService();
