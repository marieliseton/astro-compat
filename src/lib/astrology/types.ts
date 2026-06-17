export interface BirthData {
  year: number;
  month: number;   // 1-12
  day: number;
  hour: number;    // local time
  minute: number;
  latitude: number;
  longitude: number;
  timezone: string; // IANA, e.g. 'Europe/Paris'
}

export type PlanetKey =
  | 'sun' | 'moon' | 'mercury' | 'venus' | 'mars'
  | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto';

export type ZodiacSign =
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer' | 'Leo' | 'Virgo'
  | 'Libra' | 'Scorpio' | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

export type AspectType =
  | 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';

export interface PlanetPosition {
  longitude: number;     // 0-360 ecliptic
  sign: ZodiacSign;
  signDegree: number;    // 0-30 within sign
  house: number;         // 1-12
  retrograde: boolean;
}

export interface NatalChart {
  sun:     PlanetPosition;
  moon:    PlanetPosition;
  mercury: PlanetPosition;
  venus:   PlanetPosition;
  mars:    PlanetPosition;
  jupiter: PlanetPosition;
  saturn:  PlanetPosition;
  uranus:  PlanetPosition;
  neptune: PlanetPosition;
  pluto:   PlanetPosition;
  ascendant: { longitude: number; sign: ZodiacSign; signDegree: number };
  houses: number[]; // 12 cusps in ecliptic longitude
}

export interface Aspect {
  planetA: PlanetKey | 'ascendant';
  planetB: PlanetKey | 'ascendant';
  aspect: AspectType;
  orb: number;     // degrees
  exact: number;   // 0-100 (100 = perfect)
  harmonic: boolean;
}

export interface ChartRow {
  symbol: string;
  sign: string;  // French
  house: number | null;
}

export interface ChartDisplay {
  name: string;
  rows: ChartRow[];
}

// Tabbed result content — one self-contained text per category.
// harmony   : ce qui rapproche naturellement les deux personnes
// tension   : les zones de friction potentielles
// dynamic   : leur manière d'interagir ensemble
// evolution : ce que la relation peut apporter ou enseigner
export interface StructuredContent {
  harmony: string;
  tension: string;
  dynamic: string;
  evolution: string;
}
