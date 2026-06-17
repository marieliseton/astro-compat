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

  return `Tu écris pour une application de compatibilité au ton premium, éditorial et sensible. Tu analyses la dynamique relationnelle entre deux personnes avec finesse, comme un·e auteur·e, pas comme un horoscope.

Personnes : ${p1Name} et ${p2Name}
Score de compatibilité : ${score}/100

Ce qui les rapproche (indices) :
${harmonyEvidence}

Ce qui crée de la friction (indices) :
${tensionEvidence}

Produis EXACTEMENT cet objet JSON, sans markdown, sans backticks, sans rien avant ni après :

{"harmony":"...","tension":"...","dynamic":"...","evolution":"..."}

Sens de chaque catégorie :
- harmony   : ce qui rapproche naturellement ${p1Name} et ${p2Name}, ce qui se reconnaît sans effort.
- tension   : les zones de friction potentielles, dites avec honnêteté et sans dramatiser.
- dynamic   : leur manière concrète d'interagir, le rythme et la chorégraphie de la relation.
- evolution : ce que cette relation peut leur apporter ou leur enseigner, vers quoi elle peut grandir.

Chaque texte doit avoir une PERSONNALITÉ distincte pour qu'on devine la catégorie même sans son titre :
- harmony : chaleureux, lumineux, intime — le registre de la proximité et de l'évidence.
- tension : lucide, un peu plus tranchant, jamais cruel — le registre de l'écart et de l'ajustement.
- dynamic : vivant, au présent, observateur — le registre du mouvement et de l'interaction.
- evolution : ample, tourné vers l'avenir, porteur — le registre du devenir et de l'apprentissage.

Contraintes absolues :
- Le score (${score}/100) doit transparaître dans le ton : harmony et evolution plus pleins quand il est haut ; tension plus présente quand il est bas.
- ZÉRO vocabulaire astrologique : aucun mot comme planète, signe, maison, trigone, sextile, carré, opposition, aspect, ascendant, thème.
- 2 phrases courtes par texte, ~40 mots MAXIMUM. Aéré, premium. Pas de remplissage, pas de cliché, pas de généralité passe-partout.
- Cite ${p1Name} et/ou ${p2Name} dans au moins deux des quatre textes.
- Ne suppose aucune relation amoureuse, romantique ou sexuelle.
- Français soigné, poétique mais précis.`;
}
