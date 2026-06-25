import type { Aspect } from './types';
import { categorizeEvidence } from './aspect-interpreter';

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
pour une lecture sur mobile. Ton : chaleureux, concret, vivant, pas vulgaire, pas familier. AUCUN jargon astrologique
(jamais les mots "sextile", "carré", "conjonction", "opposition", "maison", ni les noms
de planètes). On parle de compatibilité GÉNÉRALE entre deux personnes, pas de romance.

LANGAGE INCLUSIF — TRÈS IMPORTANT : les prénoms ${p1Name} et ${p2Name} peuvent être masculins OU
féminins, tu ne sais pas. N'accorde JAMAIS un adjectif ou un participe passé en genre à ${p1Name} ou
${p2Name}, n'écris ni « il » ni « elle » pour eux. Préfère les prénoms, le « vous » collectif, et des
tournures avec des noms (« la sensibilité de ${p1Name} », « l'énergie de ${p2Name} ») plutôt que des
adjectifs accordés. Si un adjectif est inévitable, choisis-en un invariable au masculin/féminin.

QUALITÉ : français impeccable, ZÉRO faute d'orthographe ou de grammaire, ponctuation soignée, phrases
qui ont du sens et qui s'enchaînent bien.

Tu traites quatre facettes, dans cet ordre exact : harmonie, tension, dynamique, évolution.

Pour CHAQUE facette, écris au minimum DEUX paragraphes :
- Paragraphe 1 : décris la dynamique réelle entre ${p1Name} et ${p2Name}, de façon imagée mais
  concrète. Utilise les deux prénoms, en alternant avec "vous". Sois précis sur ce qui se
  joue entre eux — pas de généralités vagues qui marcheraient pour n'importe qui.
- Paragraphe 2 : nomme le VRAI point de friction (ou la condition pour que ça fonctionne),
  sans l'édulcorer, puis termine sur une note constructive et nuancée.

Chaque paragraphe fait 3 à 4 phrases.

Voici le registre visé (à imiter pour le ton, pas le contenu) :
"Vous êtes souvent sur la même longueur d'onde pour les aspects importants de la vie.
${p1Name} sait pousser ${p2Name} à aller au bout de ses idées, et parvient à canaliser son esprit
parfois saturé. De son côté, ${p2Name} est une véritable source d'inspiration. Toutefois, avec
le temps, il est possible que ${p1Name}, plus autoritaire, prenne le dessus et impose trop
souvent ses points de vue. Vous apprendrez sans doute à accepter les petits défauts de l'autre."

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
