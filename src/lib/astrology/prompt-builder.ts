import type { Aspect } from './types';
import { categorizeEvidence, formatBodies } from './aspect-interpreter';

const bullet = (items: string[]): string =>
  items.length ? items.map(s => `- ${s}`).join('\n') : '- (peu d\'indices marquants sur cette facette)';

export function buildCompatibilityPrompt(
  p1Name: string,
  p2Name: string,
  score: number,
  aspects: Aspect[],
): string {
  const ev = categorizeEvidence(aspects);

  return `Tu écris une interprétation de compatibilité astrale entre ${p1Name} et ${p2Name}, en français,
pour une lecture sur mobile. Ton : chaleureux, concret, vivant, accessible — jamais vulgaire ni
trop familier. On parle de compatibilité GÉNÉRALE entre deux personnes (lien humain, pas forcément
amoureux).

PUBLIC NOVICE EN ASTROLOGIE. Tu DOIS intégrer un peu de vocabulaire astrologique (la Lune, le Soleil,
Vénus, Mars, Mercure, Saturne, Jupiter, l'ascendant, le Nœud nord…) MAIS en expliquant en quelques
mots simples, la première fois que tu l'emploies, ce que le terme représente. Exemples de tournure :
« la Lune, qui parle de vos émotions », « ton ascendant, la première impression que tu donnes ».
Reste léger : un ou deux termes expliqués par facette, le texte doit rester fluide, jamais technique,
et ne jamais employer les mots "sextile", "carré", "conjonction", "opposition", "trigone" ni "maison".

LANGAGE INCLUSIF — TRÈS IMPORTANT : les prénoms ${p1Name} et ${p2Name} peuvent être masculins OU
féminins, tu ne sais pas. N'accorde JAMAIS un adjectif ou un participe passé en genre à ${p1Name} ou
${p2Name}, n'écris ni « il » ni « elle » pour eux. Préfère les prénoms, le « vous » collectif, et des
tournures avec des noms (« la sensibilité de ${p1Name} », « l'énergie de ${p2Name} ») plutôt que des
adjectifs accordés. Si un adjectif est inévitable, choisis-en un invariable au masculin/féminin.

QUALITÉ : français impeccable, ZÉRO faute d'orthographe ou de grammaire, ponctuation soignée, phrases
qui ont du sens et qui s'enchaînent bien.

Tu traites quatre facettes, dans cet ordre exact : harmonie, tension, dynamique, évolution.
Chaque facette est gouvernée par certains corps astrologiques — appuie-toi dessus pour le jargon :
- harmonie  → ${formatBodies(ev.bodies.harmony)}
- tension   → ${formatBodies(ev.bodies.tension)}
- dynamique → ${formatBodies(ev.bodies.dynamic)}
- évolution → ${formatBodies(ev.bodies.evolution)}

Pour CHAQUE facette, écris au minimum DEUX paragraphes :
- Paragraphe 1 : décris la dynamique réelle entre ${p1Name} et ${p2Name}, de façon imagée mais
  concrète, en t'appuyant sur UN corps astrologique de la facette (nommé et expliqué simplement).
  Utilise les deux prénoms, en alternant avec « vous ». Sois précis — pas de généralités passe-partout.
- Paragraphe 2 : nomme le VRAI point de friction (ou la condition pour que ça fonctionne), sans
  l'édulcorer, puis termine sur une note constructive et nuancée.

Chaque paragraphe fait 3 à 4 phrases.

Voici le registre visé (à imiter pour le ton et l'usage du jargon, pas le contenu) :
"Avec la Lune — celle qui gouverne les émotions — bien reliée entre vous, ${p1Name} et ${p2Name} se
comprennent souvent à demi-mot. ${p1Name} apporte une écoute qui rassure, tandis que ${p2Name} ouvre
de nouvelles perspectives. Le point de vigilance : veiller à ce que les non-dits ne s'installent pas.
Poser les choses à voix haute, même maladroitement, vaut toujours mieux que de deviner."

Score global de compatibilité : ${score}/100

Données pour t'appuyer (n'invente rien au-delà) :
- harmonie (ce qui les rapproche) :
${bullet(ev.harmony)}

- tension (les défis) :
${bullet(ev.tension)}

- dynamique (comment ils fonctionnent) :
${bullet(ev.dynamic)}

- évolution (ce que ça apporte) :
${bullet(ev.evolution)}

Réponds UNIQUEMENT en JSON valide, sans texte avant ni après, sans backticks. Sépare les
deux paragraphes par \\n\\n. Format exact :
{
  "harmonie": "premier paragraphe\\n\\ndeuxième paragraphe",
  "tension": "...",
  "dynamique": "...",
  "evolution": "..."
}`;
}
