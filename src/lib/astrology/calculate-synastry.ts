import type { Aspect, NatalChart, PlanetKey } from './types';
import { detectAspects, chartBodies } from './calculate-aspects';

// Only personal + social planets for synastry (outer planets too slow to be interpersonal)
const SYNASTRY_KEYS: (PlanetKey | 'ascendant')[] = [
  'sun', 'moon', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'ascendant',
];

function synastryBodies(chart: NatalChart) {
  return chartBodies(chart).filter(b => SYNASTRY_KEYS.includes(b.key));
}

export function calculateSynastry(chart1: NatalChart, chart2: NatalChart): Aspect[] {
  const bodies1 = synastryBodies(chart1);
  const bodies2 = synastryBodies(chart2);
  const aspects: Aspect[] = [];

  for (const b1 of bodies1) {
    for (const b2 of bodies2) {
      aspects.push(...detectAspects(b1.longitude, b1.key, b2.longitude, b2.key));
    }
  }

  return aspects.sort((a, b) => b.exact - a.exact);
}
