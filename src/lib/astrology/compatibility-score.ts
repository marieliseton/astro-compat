import type { Aspect } from './types';

const ASPECT_BASE: Record<string, number> = {
  trine:       +12,
  sextile:     +8,
  conjunction: +6,   // overridden per pair below
  square:      -8,
  opposition:  -10,
};

// Conjunction value by sorted planet pair
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

const PLANET_WEIGHT: Record<string, number> = {
  sun: 5, moon: 5, venus: 4, mars: 4, ascendant: 4,
  mercury: 2, jupiter: 2, saturn: 3,
  uranus: 1, neptune: 1, pluto: 1,
};

export function calculateCompatibilityScore(aspects: Aspect[]): number {
  if (aspects.length === 0) return 50;

  let totalWeighted = 0;
  let totalWeight   = 0;

  for (const asp of aspects) {
    let delta = ASPECT_BASE[asp.aspect] ?? 0;

    if (asp.aspect === 'conjunction') {
      const pair = [String(asp.planetA), String(asp.planetB)].sort().join('-');
      delta = CONJUNCTION_DELTA[pair] ?? 6;
    }

    const pWeight = (PLANET_WEIGHT[String(asp.planetA)] ?? 1)
                  + (PLANET_WEIGHT[String(asp.planetB)] ?? 1);
    const orbMult = asp.exact / 100; // tighter orb = more impact

    totalWeighted += delta * pWeight * orbMult;
    totalWeight   += pWeight;
  }

  const raw   = totalWeight > 0 ? totalWeighted / totalWeight : 0;
  const score = Math.round(50 + raw * 2.5);
  return Math.min(97, Math.max(20, score));
}
