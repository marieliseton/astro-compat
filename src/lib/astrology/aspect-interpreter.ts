import type { Aspect } from './types';

interface Translation {
  harmonic: string;
  discordant: string;
}

// Clés triées alphabétiquement (ex: 'mercury' < 'moon', 'jupiter' < 'mars')
const TRANSLATIONS: Record<string, Translation> = {
  'moon-sun':        { harmonic: 'Vous avez une facilité naturelle à vous sentir compris et accueillis mutuellement.', discordant: 'Vos besoins émotionnels et vos attentes peuvent parfois tirer dans des directions différentes.' },
  'moon-moon':       { harmonic: 'Vos sensibilités se rejoignent souvent sans effort, ce qui facilite une vraie compréhension.', discordant: 'Vous ne traitez pas toujours les situations émotionnelles au même rythme.' },
  'mars-venus':      { harmonic: 'Il existe entre vous une dynamique d\'énergie et d\'enthousiasme mutuels.', discordant: 'Vos manières d\'agir et de vous exprimer peuvent parfois créer des malentendus.' },
  'sun-venus':       { harmonic: 'Vous avez une réelle facilité à apprécier et à valoriser ce que l\'autre apporte.', discordant: 'Certaines attentes affectives risquent de rester implicites si elles ne sont pas exprimées.' },
  'moon-venus':      { harmonic: 'Il existe entre vous une tendresse naturelle et une sensibilité partagée.', discordant: 'Vos façons d\'exprimer votre affection ne sont pas toujours synchronisées.' },
  'mercury-mercury': { harmonic: 'Vos échanges sont souvent fluides et stimulants intellectuellement.', discordant: 'Vos styles de communication diffèrent, ce qui nécessite parfois des ajustements.' },
  'mercury-sun':     { harmonic: 'Vos échanges favorisent souvent la compréhension plutôt que le jugement.', discordant: 'L\'un peut parfois avoir l\'impression d\'être moins entendu que l\'autre dans vos conversations.' },
  'mercury-moon':    { harmonic: 'Vous avez une bonne capacité à mettre des mots sur vos ressentis dans vos échanges.', discordant: 'La communication émotionnelle peut parfois manquer de fluidité entre vous.' },
  'mars-mars':       { harmonic: 'Vous partagez un élan similaire face aux défis, ce qui peut être très stimulant.', discordant: 'Vous pouvez réagir très différemment face aux tensions ou aux frustrations.' },
  'saturn-sun':      { harmonic: 'L\'un apporte une stabilité et une structure que l\'autre peut trouver rassurante.', discordant: 'L\'un peut parfois avoir l\'impression d\'être freiné ou incompris par l\'autre.' },
  'moon-saturn':     { harmonic: 'L\'un apporte une structure qui peut aider l\'autre à canaliser ses émotions.', discordant: 'L\'un peut parfois ressentir que l\'autre manque de douceur ou de disponibilité émotionnelle.' },
  'saturn-venus':    { harmonic: 'L\'un apporte une solidité et une constance que l\'autre peut trouver précieuse.', discordant: 'Certaines distances affectives peuvent apparaître si les besoins ne sont pas exprimés clairement.' },
  'mars-saturn':     { harmonic: 'L\'un apporte de la rigueur là où l\'autre apporte de l\'élan.', discordant: 'L\'énergie de l\'un peut parfois être freinée ou mal comprise par l\'autre.' },
  'jupiter-sun':     { harmonic: 'Vous avez tendance à vous faire grandir mutuellement et à encourager vos ambitions.', discordant: 'Vos visions de l\'avenir peuvent parfois ne pas aller dans le même sens.' },
  'jupiter-moon':    { harmonic: 'Vous avez tendance à vous soutenir naturellement dans les périodes importantes.', discordant: 'Vos attentes affectives peuvent parfois être difficiles à équilibrer.' },
  'jupiter-mercury': { harmonic: 'Vos échanges stimulent la curiosité et l\'ouverture d\'esprit de chacun.', discordant: 'L\'un peut parfois avoir l\'impression que l\'autre minimise les détails importants.' },
  'jupiter-venus':   { harmonic: 'Vous êtes capables de faire grandir les qualités et les joies de l\'autre.', discordant: 'Vos façons d\'exprimer la générosité ou l\'affection peuvent parfois être décalées.' },
  'sun-sun':         { harmonic: 'Vous partagez une vision de la vie similaire qui facilite votre entente.', discordant: 'Vos personnalités peuvent parfois entrer en concurrence plutôt qu\'en complémentarité.' },
  'asc-sun':         { harmonic: 'L\'un ressent souvent une facilité naturelle à être soi-même face à l\'autre.', discordant: 'Il peut être difficile pour l\'un de vraiment se sentir vu et reconnu par l\'autre.' },
  'asc-moon':        { harmonic: 'Vous avez une facilité à accueillir les états émotionnels de l\'autre sans jugement.', discordant: 'Les premières impressions peuvent parfois masquer des différences émotionnelles plus profondes.' },
  'asc-venus':       { harmonic: 'Vous appréciez naturellement la présence et l\'énergie de l\'autre.', discordant: 'Vos façons d\'exprimer l\'affection ou les attentes peuvent créer des décalages.' },
  'asc-mars':        { harmonic: 'L\'un stimule naturellement l\'élan et la motivation de l\'autre.', discordant: 'L\'énergie de l\'un peut parfois être perçue comme trop directe ou pressante par l\'autre.' },
  'mars-moon':       { harmonic: 'Votre relation a une belle énergie, avec une vraie capacité à vous motiver mutuellement.', discordant: 'Vos réactions instinctives peuvent parfois s\'entrechoquer dans les moments de tension.' },
  'mars-sun':        { harmonic: 'Vous vous stimulez mutuellement à agir et à avancer vers vos objectifs.', discordant: 'Des dynamiques de leadership peuvent parfois créer des frictions entre vous.' },
  'venus-venus':     { harmonic: 'Vous partagez des valeurs et des goûts similaires qui favorisent l\'harmonie.', discordant: 'Vos attentes relationnelles peuvent parfois diverger sans que l\'un ni l\'autre ne le remarque.' },
  'moon-pluto':      { harmonic: 'Votre relation a une profondeur qui favorise une transformation mutuelle.', discordant: 'Des dynamiques intenses peuvent parfois créer une pression émotionnelle difficile à gérer.' },
  'pluto-sun':       { harmonic: 'Votre relation a une capacité de transformation et d\'évolution mutuelle profonde.', discordant: 'Des dynamiques de pouvoir peuvent parfois s\'installer inconsciemment entre vous.' },
  'asc-mercury':     { harmonic: 'Vos échanges sont naturellement fluides et stimulants pour les deux.', discordant: 'La façon dont l\'un se présente peut parfois être mal interprétée par l\'autre.' },
  'asc-asc':         { harmonic: 'Vous avez une belle aisance à vous retrouver et à interagir naturellement.', discordant: 'Vos façons d\'aborder les autres et les situations peuvent parfois différer fortement.' },
  'mercury-saturn':  { harmonic: 'L\'un apporte de la rigueur et de la profondeur aux échanges de l\'autre.', discordant: 'L\'un peut parfois ressentir que l\'autre n\'est pas pleinement disponible dans les échanges.' },
};

// 'ascendant' → 'asc' pour matcher les clés de TRANSLATIONS.
const normKey = (k: string): string => (k === 'ascendant' ? 'asc' : k);

export function interpretAspects(aspects: Aspect[]): { positive: string[]; negative: string[] } {
  const positive: string[] = [];
  const negative: string[] = [];
  const used = new Set<string>();

  for (const asp of aspects) {
    const pair = [normKey(String(asp.planetA)), normKey(String(asp.planetB))].sort().join('-');
    const tr = TRANSLATIONS[pair];
    if (!tr) continue;

    const key = `${pair}-${asp.harmonic ? 'h' : 'd'}`;
    if (used.has(key)) continue;
    used.add(key);

    if (asp.harmonic) positive.push(tr.harmonic);
    else negative.push(tr.discordant);
  }

  return { positive, negative };
}

// Fallback local : produit les 4 textes par catégorie à partir des aspects.
// Chaque catégorie garde sa voix propre, sans jargon astrologique.
export function buildLocalContent(
  aspects: Aspect[],
  p1Name: string,
  p2Name: string,
  score: number,
): import('./types').StructuredContent {
  const { positive, negative } = interpretAspects(aspects);
  const pos = positive[0] ?? '';
  const neg = negative[0] ?? '';

  // Textes courts (~40 mots max) — chaque catégorie garde sa voix propre.
  // ── Harmonie : ce qui rapproche ──────────────────────────────────────────
  const harmony = pos
    ? `Entre ${p1Name} et ${p2Name}, quelque chose se reconnaît sans avoir à s'expliquer. ${pos} Une aisance presque silencieuse, qui donne envie de rester.`
    : `${p1Name} et ${p2Name} se rejoignent dans une justesse discrète : une façon d'être ensemble qui n'a pas besoin de forcer pour exister.`;

  // ── Tension : zones de friction ──────────────────────────────────────────
  const tension = neg
    ? `Tout n'est pas lisse, et c'est honnête. ${neg} Rien d'irréparable — seulement des endroits où l'attention de chacun fera la différence.`
    : `Les frictions entre ${p1Name} et ${p2Name} restent feutrées : ce qui n'est pas nommé finit par peser. Une parole claire suffit souvent à les dissiper.`;

  // ── Dynamique : leur manière d'interagir ─────────────────────────────────
  const dynamic = score >= 60
    ? `Ensemble, ${p1Name} et ${p2Name} avancent par complémentarité plus que par ressemblance. Le rythme se trouve à deux, et c'est là que la relation prend sa couleur.`
    : `${p1Name} et ${p2Name} fonctionnent à des tempos différents, et tout se joue dans l'ajustement. Quand chacun laisse de la place à l'autre, le mouvement devient une conversation.`;

  // ── Évolution : ce que la relation enseigne ──────────────────────────────
  const evolution = score >= 60
    ? `Ce lien a de quoi faire grandir : il invite ${p1Name} et ${p2Name} à se révéler un peu plus à chaque étape, au-delà de ce qu'ils auraient imaginé seuls.`
    : `La promesse de cette relation, c'est l'apprentissage : face à une autre façon d'être, ${p1Name} et ${p2Name} en apprennent autant sur l'autre que sur eux-mêmes.`;

  return { harmony, tension, dynamic, evolution };
}
