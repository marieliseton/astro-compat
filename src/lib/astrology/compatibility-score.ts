import type { Aspect } from './types';

// ── Signed quality of each aspect ────────────────────────────────────────────
// Positive = ce qui rapproche, négatif = ce qui crée de la friction.
const ASPECT_BASE: Record<string, number> = {
  trine:       +12,
  sextile:     +8,
  conjunction: +6,   // overridden per pair below
  square:      -8,
  opposition:  -10,
};

// Conjunction value by sorted planet pair (asc normalisé en 'asc')
const CONJUNCTION_DELTA: Record<string, number> = {
  'moon-sun':     +18,
  'moon-moon':    +16,
  'mars-venus':   +16,
  'sun-venus':    +14,
  'moon-venus':   +12,
  'sun-sun':      +8,
  'jupiter-sun':  +10,
  'jupiter-moon': +9,
  'asc-sun':      +8,
  'asc-moon':     +8,
  'asc-venus':    +9,
  'mars-mars':    -4,
  'saturn-sun':   -6,
  'saturn-moon':  -8,
  'saturn-venus': -5,
};

// Importance relationnelle de chaque corps.
const PLANET_WEIGHT: Record<string, number> = {
  sun: 5, moon: 5, venus: 4, mars: 4, ascendant: 4,
  mercury: 2, jupiter: 2, saturn: 3,
  uranus: 1, neptune: 1, pluto: 1,
};

// 'ascendant' → 'asc' pour matcher les tables de paires.
const normKey = (k: string): string => (k === 'ascendant' ? 'asc' : k);

// Softening : amortit les profils avec peu d'aspects significatifs vers le
// centre. Plus la connexion est riche, plus le score peut s'éloigner du neutre.
const SOFTENING = 70;
const ANCHOR    = 62;  // tonalité de base (la synastrie réelle est rarement neutre/froide)
const SPREAD    = 36;  // amplitude max de part et d'autre de l'ancre
const SCORE_MIN = 34;
const SCORE_MAX = 97;

export interface ScoreBreakdown {
  score: number;
  support: number;   // énergie harmonieuse cumulée
  friction: number;  // énergie de tension cumulée
  balance: number;   // support / (support + friction), 0..1
}

// Magnitude signée d'un aspect (delta), avec gestion des conjonctions.
function aspectDelta(asp: Aspect): number {
  if (asp.aspect === 'conjunction') {
    const pair = [normKey(String(asp.planetA)), normKey(String(asp.planetB))].sort().join('-');
    return CONJUNCTION_DELTA[pair] ?? 6;
  }
  return ASPECT_BASE[asp.aspect] ?? 0;
}

// Poids effectif = importance des corps × justesse de l'orbe (exact/100 ∈ [0,1]).
function aspectStrength(asp: Aspect): number {
  const pWeight = (PLANET_WEIGHT[String(asp.planetA)] ?? 1)
                + (PLANET_WEIGHT[String(asp.planetB)] ?? 1);
  return pWeight * (asp.exact / 100);
}

// ── Score de compatibilité ───────────────────────────────────────────────────
// Modèle « balance » : on oppose l'énergie harmonieuse à l'énergie de tension.
// Le score suit DIRECTEMENT cet équilibre — il ne peut donc plus être élevé
// quand les tensions dominent, ni bas quand l'harmonie domine. Chaque aspect
// pèse proportionnellement à l'importance des corps ET à la justesse de l'orbe,
// si bien que les liens forts mènent la danse (cohérence avec les textes).
export function computeScoreBreakdown(aspects: Aspect[]): ScoreBreakdown {
  let support = 0;
  let friction = 0;

  for (const asp of aspects) {
    const delta = aspectDelta(asp);
    if (delta === 0) continue;
    const energy = Math.abs(delta) * aspectStrength(asp);
    if (delta > 0) support += energy;
    else friction += energy;
  }

  const total = support + friction;
  // ratio ∈ (-1, 1) ; SOFTENING ramène les profils peu fournis vers le neutre.
  const ratio   = total > 0 ? (support - friction) / (total + SOFTENING) : 0;
  const balance = total > 0 ? support / total : 0.5;

  const score = Math.min(
    SCORE_MAX,
    Math.max(SCORE_MIN, Math.round(ANCHOR + ratio * SPREAD)),
  );

  return { score, support, friction, balance };
}

export function calculateCompatibilityScore(aspects: Aspect[]): number {
  return computeScoreBreakdown(aspects).score;
}
