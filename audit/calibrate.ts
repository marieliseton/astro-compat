// Calibration des sigmoïdes de facette. Génère N paires aléatoires (graine
// fixe), calcule la somme brute par facette, en sort les percentiles, puis
// dérive center/width pour viser :
//   médiane → 62, p90 → 82, p10 → 42   (sur chaque facette).
import { calculateChart } from '../src/lib/astrology/calculate-chart';
import { calculateSynastry } from '../src/lib/astrology/calculate-synastry';
import { computeFacetRaw, FACETS, type Facet } from '../src/lib/astrology/compatibility-score';
import type { BirthData } from '../src/lib/astrology/types';

// PRNG déterministe (mulberry32)
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);

const LOCS: [number, number, string][] = [
  [48.8566, 2.3522, 'Europe/Paris'],
  [40.7128, -74.0060, 'America/New_York'],
  [35.6762, 139.6503, 'Asia/Tokyo'],
  [34.0522, -118.2437, 'America/Los_Angeles'],
  [51.5074, -0.1278, 'Europe/London'],
  [-33.8688, 151.2093, 'Australia/Sydney'],
];

function randomPerson(): BirthData {
  const year = 1950 + Math.floor(rand() * 56);   // 1950–2005
  const month = 1 + Math.floor(rand() * 12);
  const day = 1 + Math.floor(rand() * 28);
  const hour = Math.floor(rand() * 24);
  const minute = Math.floor(rand() * 60);
  const [lat, lng, tz] = LOCS[Math.floor(rand() * LOCS.length)];
  return { year, month, day, hour, minute, latitude: lat, longitude: lng, timezone: tz };
}

const N = 600;
const raws: Record<Facet, number[]> = { harmony: [], tension: [], dynamic: [], evolution: [] };

for (let i = 0; i < N; i++) {
  const c1 = calculateChart(randomPerson());
  const c2 = calculateChart(randomPerson());
  const aspects = calculateSynastry(c1, c2);
  const r = computeFacetRaw(aspects);
  for (const f of FACETS) raws[f].push(r[f]);
}

const pct = (arr: number[], p: number): number => {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) * p)];
};

// Cibles : médiane→62, p90→82, p10→42
const Z_MED = Math.log(0.62 / 0.38);   //  0.4895
const Z_P90 = Math.log(0.82 / 0.18);   //  1.5163
const Z_P10 = Math.log(0.42 / 0.58);   // -0.3228

console.log(`\n=== CALIBRATION sur ${N} paires aléatoires (graine 42) ===\n`);
console.log('facette    |    p10 | médiane |    p90 || center | width');
console.log('-----------|--------|---------|--------||--------|------');

const result: Record<Facet, { center: number; width: number }> = {} as any;
for (const f of FACETS) {
  const p10 = pct(raws[f], 0.10);
  const med = pct(raws[f], 0.50);
  const p90 = pct(raws[f], 0.90);
  const width = (p90 - p10) / (Z_P90 - Z_P10);
  const center = med - Z_MED * width;
  result[f] = { center: Math.round(center * 1000) / 1000, width: Math.round(width * 1000) / 1000 };
  console.log(
    `${f.padEnd(10)} | ${p10.toFixed(2).padStart(6)} | ${med.toFixed(2).padStart(7)} | ${p90.toFixed(2).padStart(6)} || ${result[f].center.toFixed(2).padStart(6)} | ${result[f].width.toFixed(2)}`
  );
}

console.log('\n=== CONSTANTES À COLLER dans FACET_CAL ===\n');
console.log('const FACET_CAL: Record<Facet, { center: number; width: number }> = {');
for (const f of FACETS) {
  console.log(`  ${(f + ':').padEnd(11)}{ center: ${result[f].center}, width: ${result[f].width} },`);
}
console.log('};');
