// Démo : génère le NOUVEAU prompt avec de vraies valeurs (sous-scores + indices)
// pour une paire réelle, sans toucher à prompt-builder.ts. Sert à valider le
// prompt côte à côte avant implémentation.
import { calculateChart } from '../src/lib/astrology/calculate-chart';
import { calculateSynastry } from '../src/lib/astrology/calculate-synastry';
import { computeScoreBreakdown, aspectContribution, aspectInvolves, type Facet } from '../src/lib/astrology/compatibility-score';
import { phraseForAspect } from '../src/lib/astrology/aspect-interpreter';
import type { Aspect, BirthData } from '../src/lib/astrology/types';

const p1: BirthData = { year: 1978, month: 7, day: 4, hour: 23, minute: 50, latitude: 34.0522, longitude: -118.2437, timezone: 'America/Los_Angeles' };
const p2: BirthData = { year: 1982, month: 12, day: 25, hour: 5, minute: 10, latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo' };
const p1Name = 'Camille', p2Name = 'Sacha';

const c1 = calculateChart(p1), c2 = calculateChart(p2);
const aspects = calculateSynastry(c1, c2);
const bd = computeScoreBreakdown(aspects);

// Indices COHÉRENTS avec le score : pour chaque facette, on classe les aspects
// touchant ses corps par |contribution| (même logique que le score), on garde
// les plus marquants, taggés (+) rapproche / (−) frotte.
const FACETS_ALL: Facet[] = ['harmony', 'tension', 'dynamic', 'evolution'];
function rankedEvidence(f: Facet, max = 4): string[] {
  const seen = new Set<string>();
  return aspects
    .filter(a => aspectInvolves(a, f) && phraseForAspect(a))
    .map(a => ({ a, c: aspectContribution(a) }))
    .filter(x => Math.abs(x.c) > 0.02)
    .sort((x, y) => Math.abs(y.c) - Math.abs(x.c))
    .reduce<string[]>((out, { a, c }) => {
      const phrase = phraseForAspect(a)!;
      if (out.length >= max || seen.has(phrase)) return out;
      seen.add(phrase);
      out.push(`${c >= 0 ? '(+)' : '(−)'} ${phrase}`);
      return out;
    }, []);
}
const ev: Record<Facet, string[]> = {
  harmony: rankedEvidence('harmony'), tension: rankedEvidence('tension'),
  dynamic: rankedEvidence('dynamic'), evolution: rankedEvidence('evolution'),
};

const facetLabel = (f: Facet, v: number): string => {
  if (f === 'tension') {
    if (v >= 75) return 'très peu de friction';
    if (v >= 60) return 'friction légère';
    if (v >= 45) return 'friction modérée';
    return 'friction marquée';
  }
  if (v >= 75) return 'forte';
  if (v >= 60) return 'bonne';
  if (v >= 45) return 'modeste';
  return 'faible';
};

const bullet = (items: string[]): string =>
  items.length ? items.map(s => `  - ${s}`).join('\n') : '  - (peu d\'indices marquants sur cette facette)';

const f = bd.facets;
const prompt = `Tu écris une interprétation de compatibilité astrale entre ${p1Name} et ${p2Name}, en
français, pour une lecture sur mobile.

CONTEXTE : compatibilité GÉNÉRALE entre deux personnes (ni spécifiquement amoureuse ni
amicale — une compatibilité globale qui peut effleurer l'affectif sans s'y enfermer). La
personne qui lit veut savoir HONNÊTEMENT où en est sa compatibilité avec ${p2Name}.

TON : chaleureux mais franc, concret, vivant. Jamais vulgaire ni familier. AUCUN jargon
astrologique (jamais les mots "sextile", "carré", "conjonction", "opposition", "maison",
ni les noms de planètes).

RÈGLE D'HONNÊTETÉ (la plus importante) : ne flatte pas. Chaque facette porte un score sur
100 ; ton texte DOIT coller à ce score :
- score faible → dis clairement, avec tact, que ça coince sur cette facette ; n'enrobe pas.
- score moyen → nuance : ce qui marche ET ce qui demande des efforts.
- score fort → tu peux être chaleureux, mais reste concret.
Un score bas accompagné d'un texte dithyrambique = échec. C'est l'honnêteté qui rend le
résultat crédible plutôt que flatteur.

ZÉRO généralité horoscopique : aucune phrase passe-partout qui marcherait pour n'importe
qui. Chaque phrase décrit CES deux personnes précisément. Utilise les deux prénoms
(${p1Name}, ${p2Name}) en alternance avec "vous".

Score global de compatibilité : ${bd.score}/100

Tu traites quatre facettes, dans cet ordre exact : harmonie, tension, dynamique, évolution.
Pour CHAQUE facette, écris DEUX paragraphes :
- Paragraphe 1 (3–4 phrases) : qu'est-ce qui se joue vraiment entre ${p1Name} et ${p2Name}
  sur cette facette ? Décris la dynamique concrète, imagée mais précise.
- Paragraphe 2 (3–4 phrases) : où est-ce que ça frotte, et à quelle condition ça fonctionne
  durablement ? Nomme le vrai point sans l'édulcorer, puis finis sur une note constructive
  et réaliste.

— HARMONIE (ce qui rapproche) — score ${f.harmony}/100 (${facetLabel('harmony', f.harmony)})
${bullet(ev.harmony)}

— TENSION (les défis) — score ${f.tension}/100 (${facetLabel('tension', f.tension)})
  (rappel : score ÉLEVÉ = peu de friction ; score BAS = friction réelle à nommer franchement)
${bullet(ev.tension)}

— DYNAMIQUE (comment vous fonctionnez ensemble) — score ${f.dynamic}/100 (${facetLabel('dynamic', f.dynamic)})
${bullet(ev.dynamic)}

— ÉVOLUTION (ce que la relation apporte) — score ${f.evolution}/100 (${facetLabel('evolution', f.evolution)})
${bullet(ev.evolution)}

Registre de TON visé (à imiter pour le style, surtout pas le contenu) :
"Vous êtes souvent sur la même longueur d'onde pour les choses importantes. ${p1Name} sait
pousser ${p2Name} à aller au bout de ses idées ; en retour, ${p2Name} est une vraie source
d'inspiration. Avec le temps, ${p1Name}, plus directif, risque parfois d'imposer ses vues —
et c'est là qu'il faudra veiller à laisser de la place à l'autre."

Termine par une SYNTHÈSE honnête de 2 à 3 phrases : un verdict nuancé sur la relation dans
son ensemble, cohérent avec le score global de ${bd.score}/100. Ni complaisant ni
démoralisant — juste vrai.

Réponds UNIQUEMENT en JSON valide, sans texte avant ni après, sans backticks. Sépare les
deux paragraphes de chaque facette par \\n\\n. Format exact :
{
  "harmonie": "premier paragraphe\\n\\ndeuxième paragraphe",
  "tension": "...",
  "dynamique": "...",
  "evolution": "...",
  "synthese": "..."
}`;

console.log(`\n### Paire de démo : ${p1Name} (${p1.year}) × ${p2Name} (${p2.year})`);
console.log(`### Score global ${bd.score} — harmonie ${f.harmony} / tension ${f.tension} / dynamique ${f.dynamic} / évolution ${f.evolution}\n`);
console.log('═'.repeat(78));
console.log(prompt);
console.log('═'.repeat(78));
