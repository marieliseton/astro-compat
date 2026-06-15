import type { Aspect, AspectType, NatalChart, PlanetKey } from './types';

interface AspectDef {
  angle: number;
  orb: number;
  harmonic: boolean;
}

const ASPECT_DEFS: Record<AspectType, AspectDef> = {
  conjunction: { angle: 0,   orb: 8, harmonic: true  },
  sextile:     { angle: 60,  orb: 6, harmonic: true  },
  square:      { angle: 90,  orb: 7, harmonic: false },
  trine:       { angle: 120, orb: 7, harmonic: true  },
  opposition:  { angle: 180, orb: 8, harmonic: false },
};

function angleDiff(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

function detectAspects(
  lonA: number, keyA: PlanetKey | 'ascendant',
  lonB: number, keyB: PlanetKey | 'ascendant',
): Aspect[] {
  const results: Aspect[] = [];
  const diff = angleDiff(lonA, lonB);

  for (const [type, def] of Object.entries(ASPECT_DEFS) as [AspectType, AspectDef][]) {
    const orb = Math.abs(diff - def.angle);
    if (orb <= def.orb) {
      results.push({
        planetA: keyA,
        planetB: keyB,
        aspect: type,
        orb: Math.round(orb * 10) / 10,
        exact: Math.round((1 - orb / def.orb) * 100),
        harmonic: def.harmonic,
      });
    }
  }
  return results;
}

type Body = { key: PlanetKey | 'ascendant'; longitude: number };

function chartBodies(chart: NatalChart): Body[] {
  const planets: PlanetKey[] = [
    'sun', 'moon', 'mercury', 'venus', 'mars',
    'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
  ];
  const bodies: Body[] = planets.map(k => ({ key: k, longitude: chart[k].longitude }));
  bodies.push({ key: 'ascendant', longitude: chart.ascendant.longitude });
  return bodies;
}

// Natal aspects (within a single chart)
export function calculateAspects(chart: NatalChart): Aspect[] {
  const bodies = chartBodies(chart);
  const aspects: Aspect[] = [];

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      aspects.push(...detectAspects(bodies[i].longitude, bodies[i].key, bodies[j].longitude, bodies[j].key));
    }
  }

  return aspects.sort((a, b) => b.exact - a.exact);
}

// Synastry aspects (between two charts — exported from calculate-synastry.ts)
export { detectAspects, chartBodies };
