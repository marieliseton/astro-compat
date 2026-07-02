import type { Aspect } from './types';
import { categorizeEvidence } from './aspect-interpreter';

const bullet = (items: string[], noEvidence: string): string =>
  items.length ? items.map(s => `- ${s}`).join('\n') : `- (${noEvidence})`;

export function buildCompatibilityPrompt(
  p1Name: string,
  p2Name: string,
  score: number,
  aspects: Aspect[],
  lang: 'fr' | 'en' = 'fr',
): string {
  const ev = categorizeEvidence(aspects);

  if (lang === 'en') {
    const noEv = 'no notable evidence for this facet';
    return `You are writing an astrological compatibility interpretation between ${p1Name} and ${p2Name}, in English,
for mobile reading. Tone: warm, concrete, vivid, not vulgar, not overly casual. NO astrological jargon
(never use words like "sextile", "square", "conjunction", "opposition", "house", or planet names).
We're talking about GENERAL compatibility between two people, not romance.

INCLUSIVE LANGUAGE — VERY IMPORTANT: the names ${p1Name} and ${p2Name} can be masculine OR feminine,
you don't know. NEVER assign gender to ${p1Name} or ${p2Name}. Don't use "he" or "she" for them.
Prefer their names, collective "you", and noun constructions ("${p1Name}'s sensitivity",
"${p2Name}'s energy") rather than gendered pronouns or adjectives.

QUALITY: impeccable English, ZERO grammatical errors, careful punctuation, sentences that make sense
and flow well together.

You cover four facets, in this exact order: harmony, tension, dynamic, evolution.

For EACH facet, write at least TWO paragraphs:
- Paragraph 1: describe the real dynamic between ${p1Name} and ${p2Name} in an evocative but concrete way.
  Use both names, alternating with "you". Be specific about what's actually at play between them —
  no vague generalities that could apply to anyone.
- Paragraph 2: name the REAL point of friction (or the condition for things to work),
  without sugarcoating it, then end on a constructive and nuanced note.

Each paragraph is 3 to 4 sentences.

Example of the target register (imitate the tone, not the content):
"You often seem to be on the same wavelength when it comes to what matters in life.
${p1Name} has a way of pushing ${p2Name} to see ideas through, and can help channel ${p2Name}'s
sometimes scattered thinking. In turn, ${p2Name} is a genuine source of inspiration. Over time, though,
${p1Name}'s tendency to take charge may lead to imposing their views too often. You will likely learn
to accept each other's rough edges."

Overall compatibility score: ${score}/100

Data to draw from (don't invent anything beyond this):
- harmony (what brings them together):
${bullet(ev.harmony, noEv)}

- tension (the challenges):
${bullet(ev.tension, noEv)}

- dynamic (how they operate):
${bullet(ev.dynamic, noEv)}

- evolution (what this brings):
${bullet(ev.evolution, noEv)}

Respond ONLY with valid JSON, no text before or after, no backticks. Separate the two paragraphs with \\n\\n.
Exact format:
{
  "harmony": "first paragraph\\n\\nsecond paragraph",
  "tension": "...",
  "dynamic": "...",
  "evolution": "..."
}`;
  }

  const noEv = "peu d'indices marquants sur cette facette";
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
${bullet(ev.harmony, noEv)}

- tension (les défis) :
${bullet(ev.tension, noEv)}

- dynamique (comment ils fonctionnent) :
${bullet(ev.dynamic, noEv)}

- évolution (ce que ça apporte) :
${bullet(ev.evolution, noEv)}

Réponds UNIQUEMENT en JSON valide, sans texte avant ni après, sans backticks. Sépare les
deux paragraphes par \\n\\n. Format exact :
{
  "harmonie": "premier paragraphe\\n\\ndeuxième paragraphe",
  "tension": "...",
  "dynamique": "...",
  "evolution": "..."
}`;
}
