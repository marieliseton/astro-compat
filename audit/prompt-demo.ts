// Vérif end-to-end du VRAI code de prod : buildCompatibilityPrompt (nouveau
// prompt + indices classés) et buildLocalContent (fallback avec synthèse).
import { calculateChart } from '../src/lib/astrology/calculate-chart';
import { calculateSynastry } from '../src/lib/astrology/calculate-synastry';
import { computeScoreBreakdown } from '../src/lib/astrology/compatibility-score';
import { buildCompatibilityPrompt } from '../src/lib/astrology/prompt-builder';
import { buildLocalContent } from '../src/lib/astrology/aspect-interpreter';
import type { BirthData } from '../src/lib/astrology/types';

const cases: [string, string, BirthData, BirthData][] = [
  ['Camille', 'Sacha',
    { year: 1978, month: 7, day: 4, hour: 23, minute: 50, latitude: 34.0522, longitude: -118.2437, timezone: 'America/Los_Angeles' },
    { year: 1982, month: 12, day: 25, hour: 5, minute: 10, latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo' }],
  ['Léa', 'Tom',
    { year: 1990, month: 6, day: 15, hour: 14, minute: 30, latitude: 48.8566, longitude: 2.3522, timezone: 'Europe/Paris' },
    { year: 1990, month: 6, day: 15, hour: 15, minute: 0, latitude: 48.8566, longitude: 2.3522, timezone: 'Europe/Paris' }],
];

for (const [n1, n2, b1, b2] of cases) {
  const aspects = calculateSynastry(calculateChart(b1), calculateChart(b2));
  const bd = computeScoreBreakdown(aspects);
  console.log('\n' + '█'.repeat(78));
  console.log(`PAIRE ${n1} × ${n2} — global ${bd.score} | harmo ${bd.facets.harmony} / tens ${bd.facets.tension} / dyn ${bd.facets.dynamic} / évol ${bd.facets.evolution}`);
  console.log('█'.repeat(78));
  console.log('\n----- PROMPT GEMINI (réel) -----\n');
  console.log(buildCompatibilityPrompt(n1, n2, bd, aspects));
  console.log('\n----- FALLBACK LOCAL — SYNTHÈSE -----\n');
  console.log(buildLocalContent(aspects, n1, n2, bd.score).synthesis);
}
