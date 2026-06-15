import type { Aspect } from './types';

const PLANET_LABEL: Record<string, string> = {
  sun: 'Soleil', moon: 'Lune', mercury: 'Mercure', venus: 'Vénus',
  mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturne',
  uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluton',
  ascendant: 'Ascendant',
};

// Translate an aspect into a brief human-language fragment for the prompt
function aspectSummary(asp: Aspect): string {
  const a = PLANET_LABEL[String(asp.planetA)] ?? asp.planetA;
  const b = PLANET_LABEL[String(asp.planetB)] ?? asp.planetB;
  const quality = asp.harmonic ? 'lien harmonieux' : 'tension potentielle';
  return `${a}/${b} (${quality}, orbe ${asp.orb}°)`;
}

// Build a minimal Gemini prompt — only top aspects to reduce token usage
export function buildCompatibilityPrompt(
  p1Name: string,
  p2Name: string,
  score: number,
  aspects: Aspect[],
): string {
  const harmonic = aspects.filter(a => a.harmonic).slice(0, 3).map(aspectSummary);
  const tension  = aspects.filter(a => !a.harmonic).slice(0, 3).map(aspectSummary);

  const harmonicStr = harmonic.length ? harmonic.join(' | ') : 'aucun significatif';
  const tensionStr  = tension.length  ? tension.join(' | ')  : 'aucune significative';

  return `Tu es un expert en psychologie relationnelle. Tu analyses les dynamiques humaines de façon bienveillante et précise.

Données entre ${p1Name} et ${p2Name} :
Score de compatibilité : ${score}/100
Liens forts : ${harmonicStr}
Tensions : ${tensionStr}

Génère une analyse structurée. Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans backticks, sans texte avant ou après.

{"resume":"[3 à 5 phrases décrivant la dynamique principale, avec leurs prénoms, spécifique et non générique]","greenFlags":["[force 1]","[force 2]","[force 3]"],"redFlags":["[défi bienveillant 1]","[défi bienveillant 2]","[défi bienveillant 3]"],"dynamique":{"paragraphe":"[paragraphe de synthèse sur comment ils interagissent]","points":["[point 1]","[point 2]","[point 3]"]}}

Règles absolues :
- Zéro vocabulaire astrologique (planète, signe, trigone, carré, aspect, maison, etc.)
- Utilise ${p1Name} et ${p2Name} dans le résumé
- Langage psychologique et relationnel uniquement
- Ne suppose aucune relation amoureuse, romantique ou sexuelle
- 3 à 5 éléments dans greenFlags et redFlags
- Ton bienveillant, direct, sans clichés ni généralités`;
}
