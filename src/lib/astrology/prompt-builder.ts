import type { Aspect } from './types';
import { categorizeEvidence } from './aspect-interpreter';

const bullet = (items: string[]): string =>
  items.length ? items.map(s => `- ${s}`).join('\n') : '- (peu d\'indices marquants sur cette facette)';

// Construit le prompt Gemini : 4 textes, chacun dérivé d'indices DIFFÉRENTS
// (déjà traduits sans jargon astrologique) et répondant à SA propre question.
export function buildCompatibilityPrompt(
  p1Name: string,
  p2Name: string,
  score: number,
  aspects: Aspect[],
): string {
  const ev = categorizeEvidence(aspects);

  return `Tu écris pour une appli de compatibilité au ton premium mais FUN. Direct, vivant, un brin décalé : tu balances des observations vraies et parlantes, avec le sourire — comme un·e ami·e hyper lucide qui dit les choses. Surtout pas un horoscope, surtout pas mièvre ni vague.

Personnes : ${p1Name} et ${p2Name}
Score global de compatibilité : ${score}/100

Tu produis EXACTEMENT cet objet JSON, sans markdown, sans backticks, sans rien avant ni après :

{"harmony":"...","tension":"...","dynamic":"...","evolution":"..."}

RÈGLE CENTRALE : chaque catégorie explore une FACETTE DIFFÉRENTE de la relation, à partir d'indices DIFFÉRENTS (fournis ci-dessous). Ne réutilise pas les mêmes idées d'une catégorie à l'autre. Chaque texte répond à SA question et reste branché sur SES indices — on ne doit jamais avoir l'impression de relire le même résumé reformulé.

━━━ HARMONIE ━━━
Question : « Qu'est-ce qui rapproche naturellement ${p1Name} et ${p2Name} ? »
Tu décris : leurs affinités, leurs valeurs communes, leurs complémentarités naturelles.
Indices observés (à reformuler en langage humain, PAS à recopier) :
${bullet(ev.harmony)}

━━━ TENSION ━━━
Question : « Quels sont les défis de cette relation ? »
Tu décris : les incompréhensions possibles, les différences de rythme, les points de friction.
Indices observés :
${bullet(ev.tension)}

━━━ DYNAMIQUE ━━━
Question : « Comment ${p1Name} et ${p2Name} fonctionnent-ils ensemble ? »
Tu décris : leur manière de communiquer, leur équilibre, leur interaction au quotidien.
Indices observés :
${bullet(ev.dynamic)}

━━━ ÉVOLUTION ━━━
Question : « Que peut apporter cette relation ? »
Tu décris : les apprentissages, la croissance, le potentiel de développement mutuel.
Indices observés :
${bullet(ev.evolution)}

Personnalité de chaque texte (pour qu'on devine la facette même sans titre) :
- harmony : complice, chaleureux, un peu malicieux — « ce qui matche ».
- tension : cash et lucide, mais qui dédramatise — « là où ça frotte ».
- dynamic : punchy, concret, au présent — « comment vous tournez ».
- evolution : motivant, qui projette — « là où ça peut vous emmener ».

Contraintes absolues :
- ANCRAGE : chaque phrase doit refléter les INDICES de SA catégorie. Le texte doit donner l'impression d'être directement dérivé de ce qui a été observé entre CES deux personnes.
- ANTI-GÉNÉRIQUE : bannis toute phrase applicable à n'importe quel couple (« la communication est clé », « il faut des compromis », « l'amour demande des efforts »…). Zéro banalité, zéro remplissage.
- ZÉRO vocabulaire astrologique : aucun mot comme planète, signe, maison, trigone, sextile, carré, opposition, conjonction, aspect, ascendant, nœud, thème, Vénus, Mars, Saturne, etc. Traduis tout en langage humain concret.
- TON : direct, fun, parlant, un brin quirky. Concret plutôt que poétique. Tu peux t'adresser à eux (« vous »), glisser une image qui claque. Reste classe, jamais lourd.
- LONGUEUR : 4 à 6 phrases par texte, ~70 mots MAXIMUM chacun.
- Le score (${score}/100) colore le ton : haut = enthousiaste ; bas = honnête sur les frictions, mais jamais déprimant.
- Cite ${p1Name} et/ou ${p2Name} dans au moins deux des quatre textes.
- Ne suppose aucune relation amoureuse, romantique ou sexuelle. Français soigné.`;
}
