// Probe d'instabilité : on fixe une paire et on fait varier l'heure de
// naissance de la 1re personne sur 24h. Un bon score devrait bouger un peu
// (l'Ascendant tourne) mais rester STABLE. De gros sauts = instabilité.
import { calculateChart } from '../src/lib/astrology/calculate-chart';
import { calculateSynastry } from '../src/lib/astrology/calculate-synastry';
import { computeScoreBreakdown } from '../src/lib/astrology/compatibility-score';
import type { BirthData } from '../src/lib/astrology/types';

const base2: BirthData = { year: 1990, month: 6, day: 15, hour: 15, minute: 0, latitude: 48.8566, longitude: 2.3522, timezone: 'Europe/Paris' };

console.log('\n=== SENSIBILITÉ À L\'HEURE DE NAISSANCE (p1) ===');
console.log('La 2e personne est fixe. On bouge seulement l\'heure de p1.\n');
console.log('heure | score |   harmo | tension | #asp');
console.log('------|-------|---------|---------|-----');

const scores: number[] = [];
for (let h = 0; h < 24; h += 2) {
  const p1: BirthData = { year: 1988, month: 3, day: 21, hour: h, minute: 0, latitude: 40.7128, longitude: -74.0060, timezone: 'America/New_York' };
  const c1 = calculateChart(p1);
  const c2 = calculateChart(base2);
  const aspects = calculateSynastry(c1, c2);
  const b = computeScoreBreakdown(aspects);
  scores.push(b.score);
  console.log(`${String(h).padStart(5)} | ${String(b.score).padStart(5)} | ${String(b.facets.harmony).padStart(7)} | ${String(b.facets.tension).padStart(8)} | ${String(aspects.length).padStart(4)}`);
}

const min = Math.min(...scores), max = Math.max(...scores);
console.log(`\n→ Pour une MÊME paire, le score oscille de ${min} à ${max} (amplitude ${max - min} pts) selon la seule heure de naissance.`);
console.log('  Une partie est légitime (Ascendant), mais l\'ampleur révèle la sensibilité aux aspects à large orbe.');
