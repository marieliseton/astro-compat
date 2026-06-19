import type { Aspect } from './types';
import type { ScoreBreakdown, Facet } from './compatibility-score';
import { buildPromptEvidence } from './aspect-interpreter';

const bullet = (items: string[]): string =>
  items.length ? items.map(s => `  - ${s}`).join('\n') : '  - (peu d\'indices marquants sur cette facette)';

// Label qualitatif par facette. Pour « tension », un score ÉLEVÉ = peu de
// friction (le sous-score est orienté « bon pour la relation »), donc le label
// est inversé pour rester lisible.
function facetLabel(f: Facet, v: number): string {
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
}

export function buildCompatibilityPrompt(
  p1Name: string,
  p2Name: string,
  breakdown: ScoreBreakdown,
  aspects: Aspect[],
): string {
  const ev = buildPromptEvidence(aspects);
  const f = breakdown.facets;

  return `Tu écris une interprétation de compatibilité astrale entre ${p1Name} et ${p2Name}, en
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

Score global de compatibilité : ${breakdown.score}/100

Tu traites quatre facettes, dans cet ordre exact : harmonie, tension, dynamique, évolution.
Pour CHAQUE facette, écris DEUX paragraphes :
- Paragraphe 1 (3 à 4 phrases) : qu'est-ce qui se joue vraiment entre ${p1Name} et ${p2Name}
  sur cette facette ? Décris la dynamique concrète, imagée mais précise.
- Paragraphe 2 (3 à 4 phrases) : où est-ce que ça frotte, et à quelle condition ça fonctionne
  durablement ? Nomme le vrai point sans l'édulcorer, puis finis sur une note constructive
  et réaliste.

Les indices ci-dessous sont taggés (+) = rapproche, (−) = frotte. Appuie-toi dessus, n'invente
rien au-delà.

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
son ensemble, cohérent avec le score global de ${breakdown.score}/100. Ni complaisant ni
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
}
