// Audit du scoring de compatibilité — fait tourner le VRAI code de production
// (calculateChart → calculateSynastry → computeScoreBreakdown) sur 15 paires.
import { calculateChart } from '../src/lib/astrology/calculate-chart';
import { calculateSynastry } from '../src/lib/astrology/calculate-synastry';
import { computeScoreBreakdown } from '../src/lib/astrology/compatibility-score';
import type { BirthData } from '../src/lib/astrology/types';

interface Person { name: string; bd: BirthData; }

const P = (name: string, y: number, mo: number, d: number, h: number, mi: number,
           lat: number, lng: number, tz: string): Person =>
  ({ name, bd: { year: y, month: mo, day: d, hour: h, minute: mi, latitude: lat, longitude: lng, timezone: tz } });

// Lieux courants
const PARIS = [48.8566, 2.3522, 'Europe/Paris'] as const;
const NYC   = [40.7128, -74.0060, 'America/New_York'] as const;
const TOKYO = [35.6762, 139.6503, 'Asia/Tokyo'] as const;
const LA    = [34.0522, -118.2437, 'America/Los_Angeles'] as const;

// 15 paires variées : jumeaux, même signe, saisons opposées, décennies différentes…
const PAIRS: [Person, Person, string][] = [
  [P('A1', 1990, 6, 15, 14, 30, ...PARIS), P('A2', 1990, 6, 15, 15, 0, ...PARIS), 'né.es le même jour (quasi-jumeaux)'],
  [P('B1', 1988, 3, 21, 9, 0, ...PARIS),  P('B2', 1992, 3, 20, 18, 30, ...NYC),   'même signe solaire, 4 ans d\'écart'],
  [P('C1', 1985, 1, 10, 6, 15, ...PARIS), P('C2', 1985, 7, 12, 22, 45, ...TOKYO), 'saisons opposées, même année'],
  [P('D1', 1995, 11, 3, 12, 0, ...LA),    P('D2', 1970, 5, 28, 3, 30, ...PARIS),  '25 ans d\'écart'],
  [P('E1', 2000, 9, 9, 16, 20, ...NYC),   P('E2', 2001, 2, 14, 8, 0, ...NYC),     'génération Z, ~1.5 an'],
  [P('F1', 1978, 7, 4, 23, 50, ...LA),    P('F2', 1982, 12, 25, 5, 10, ...TOKYO), 'fin 70s vs début 80s'],
  [P('G1', 1993, 4, 18, 11, 11, ...PARIS),P('G2', 1993, 4, 19, 11, 30, ...PARIS), 'à un jour près'],
  [P('H1', 1968, 8, 30, 7, 45, ...PARIS), P('H2', 1996, 10, 2, 19, 0, ...NYC),    'boomer vs millennial'],
  [P('I1', 1991, 12, 12, 0, 30, ...TOKYO),P('I2', 1989, 6, 6, 13, 0, ...LA),      'aléatoire transpacifique'],
  [P('J1', 1975, 2, 28, 4, 0, ...PARIS),  P('J2', 1975, 8, 31, 20, 0, ...PARIS),  '6 mois d\'écart, même ville'],
  [P('K1', 1999, 5, 5, 17, 17, ...NYC),   P('K2', 1999, 5, 5, 17, 17, ...NYC),    'identiques (même thème)'],
  [P('L1', 1983, 10, 14, 10, 0, ...LA),   P('L2', 1987, 1, 22, 14, 30, ...PARIS), '80s, signes éloignés'],
  [P('M1', 1972, 9, 1, 6, 0, ...TOKYO),   P('M2', 2003, 3, 17, 21, 45, ...NYC),   '31 ans d\'écart'],
  [P('N1', 1994, 7, 23, 13, 13, ...PARIS),P('N2', 1990, 11, 30, 2, 0, ...LA),     'aléatoire 90s'],
  [P('O1', 1986, 4, 1, 8, 8, ...NYC),     P('O2', 1986, 10, 8, 16, 40, ...TOKYO), 'même année, ~6 mois'],
];

interface Row { label: string; score: number; h: number; t: number; d: number; e: number; n: number; }
const rows: Row[] = [];

for (const [p1, p2, label] of PAIRS) {
  const c1 = calculateChart(p1.bd);
  const c2 = calculateChart(p2.bd);
  const aspects = calculateSynastry(c1, c2);
  const b = computeScoreBreakdown(aspects);
  rows.push({ label, score: b.score, h: b.facets.harmony, t: b.facets.tension, d: b.facets.dynamic, e: b.facets.evolution, n: aspects.length });
}

// ── Tableau ──
console.log('\n=== SCORES PAR PAIRE (global + 4 sous-scores) ===\n');
console.log('global | harmo | tens | dyn | évol | #asp | description');
console.log('-------|-------|------|-----|------|------|------------');
for (const r of rows.sort((a, b) => b.score - a.score)) {
  console.log(
    `${String(r.score).padStart(6)} | ${String(r.h).padStart(5)} | ${String(r.t).padStart(4)} | ${String(r.d).padStart(3)} | ${String(r.e).padStart(4)} | ${String(r.n).padStart(4)} | ${r.label}`
  );
}

// ── Stats ──
const scores = rows.map(r => r.score).sort((a, b) => a - b);
const mean = scores.reduce((s, x) => s + x, 0) / scores.length;
const variance = scores.reduce((s, x) => s + (x - mean) ** 2, 0) / scores.length;
const std = Math.sqrt(variance);
const median = scores[Math.floor(scores.length / 2)];
console.log('\n=== STATISTIQUES ===');
console.log(`min=${scores[0]}  max=${scores[scores.length-1]}  étendue=${scores[scores.length-1]-scores[0]}`);
console.log(`moyenne=${mean.toFixed(1)}  médiane=${median}  écart-type=${std.toFixed(1)}`);

// ── Histogramme (tranches de 5) ──
console.log('\n=== DISTRIBUTION (tranches de 5) ===');
const buckets: Record<string, number> = {};
for (const s of scores) {
  const lo = Math.floor(s / 5) * 5;
  const key = `${lo}-${lo + 4}`;
  buckets[key] = (buckets[key] || 0) + 1;
}
for (let lo = 30; lo <= 100; lo += 5) {
  const key = `${lo}-${lo + 4}`;
  const n = buckets[key] || 0;
  console.log(`${key.padStart(7)} | ${'█'.repeat(n)}${n ? ' ' + n : ''}`);
}
