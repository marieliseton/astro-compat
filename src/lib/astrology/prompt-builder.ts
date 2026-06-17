import type { Aspect } from './types';
import { interpretAspects } from './aspect-interpreter';

const bullet = (items: string[]): string =>
  items.length ? items.map(s => `- ${s}`).join('\n') : '- (rien de marquant)';

// Construit le prompt Gemini : 4 textes par catégorie, chacun ancré dans des
// indices relationnels réels (déjà traduits sans jargon astrologique).
export function buildCompatibilityPrompt(
  p1Name: string,
  p2Name: string,
  score: number,
  aspects: Aspect[],
): string {
  const { positive, negative } = interpretAspects(aspects);
  const harmonyEvidence = bullet(positive.slice(0, 6));
  const tensionEvidence = bullet(negative.slice(0, 6));

  return `Tu écris pour une appli de compatibilité au ton premium mais FUN. Direct, vivant, un brin décalé : tu balances des observations vraies et parlantes, avec le sourire — comme un·e ami·e hyper lucide qui dit les choses. Surtout pas un horoscope, surtout pas mièvre ni vague.

Personnes : ${p1Name} et ${p2Name}
Score de compatibilité : ${score}/100

Ce qui les rapproche (indices) :
${harmonyEvidence}

Ce qui crée de la friction (indices) :
${tensionEvidence}

Produis EXACTEMENT cet objet JSON, sans markdown, sans backticks, sans rien avant ni après :

{"harmony":"...","tension":"...","dynamic":"...","evolution":"..."}

Sens de chaque catégorie :
- harmony   : ce qui les rapproche pour de vrai, ce qui matche sans effort.
- tension   : là où ça coince, dit franchement et sans dramatiser.
- dynamic   : comment ils fonctionnent concrètement ensemble, qui fait quoi.
- evolution : ce que cette relation peut leur apporter, vers quoi elle les pousse.

Chaque texte a une PERSONNALITÉ nette pour qu'on devine la catégorie même sans titre :
- harmony : complice, chaleureux, un peu malicieux — « vous deux, ça matche ».
- tension : cash et lucide, mais qui dédramatise — « là où ça frotte ».
- dynamic : punchy, concret, au présent — « voilà comment vous tournez ».
- evolution : motivant, qui projette — « là où ça peut vous emmener ».

Contraintes absolues :
- TON : direct, fun, parlant, un brin quirky. Concret plutôt que poétique. Tu peux t'adresser à eux (« vous »), glisser une pointe d'humour, une image qui claque. Reste classe, jamais lourd.
- LONGUEUR : 4 à 6 phrases par texte, ~65 mots MAXIMUM. Plus long et plus vivant qu'un slogan, assez court pour tenir sans scroll.
- Le score (${score}/100) transparaît dans le ton : haut = enthousiaste ; bas = plus honnête sur les frictions, mais jamais déprimant.
- ZÉRO vocabulaire astrologique : aucun mot comme planète, signe, maison, trigone, sextile, carré, opposition, aspect, ascendant, thème.
- Cite ${p1Name} et/ou ${p2Name} dans au moins deux des quatre textes.
- Ne suppose aucune relation amoureuse, romantique ou sexuelle.
- Rien de générique : on doit sentir que ça parle de CES deux personnes. Français soigné.`;
}
