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

const HARMONIC_TYPES = new Set(['trine', 'sextile', 'conjunction']);

export function interpretAspects(aspects: Aspect[]): { positive: string[]; negative: string[] } {
  const positive: string[] = [];
  const negative: string[] = [];
  const used = new Set<string>();

  for (const asp of aspects) {
    const pair = [String(asp.planetA), String(asp.planetB)].sort().join('-');
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

// Fallback: build structured content locally from aspect data
export function buildLocalContent(
  aspects: Aspect[],
  p1Name: string,
  p2Name: string,
  score: number,
): import('./types').StructuredContent {
  const { positive, negative } = interpretAspects(aspects);

  const genericPos = [
    'Vous êtes capables de vous soutenir mutuellement dans les moments importants.',
    'Il existe entre vous une base de respect mutuel solide.',
    'Votre relation a le potentiel de vous faire grandir chacun à votre façon.',
  ];
  const genericNeg = [
    'Certains moments nécessiteront plus d\'écoute et de patience.',
    'Des attentes non exprimées pourraient créer des tensions si elles s\'accumulent.',
    'Vos différences demandent parfois un effort conscient pour être comprises.',
  ];

  const greenFlags = [...positive];
  const redFlags   = [...negative];
  let gi = 0; while (greenFlags.length < 3) greenFlags.push(genericPos[gi++ % genericPos.length]);
  let ri = 0; while (redFlags.length   < 3) redFlags.push(genericNeg[ri++ % genericNeg.length]);
  greenFlags.length = Math.min(greenFlags.length, 5);
  redFlags.length   = Math.min(redFlags.length, 5);

  const resume = score >= 75
    ? `${p1Name} et ${p2Name} partagent une dynamique relationnelle particulièrement fluide. Leurs façons d'être se complètent sur des points essentiels, créant une base solide pour se comprendre et s'appuyer mutuellement. Cette relation a tout pour évoluer dans un climat de confiance et de croissance partagée.`
    : score >= 60
    ? `La relation entre ${p1Name} et ${p2Name} est riche en potentiel, même si elle demande une certaine conscience des différences de chacun. Leurs forces se rejoignent sur plusieurs points importants, tout en laissant de la place pour apprendre de l'autre. Avec un peu d'attention mutuelle, ce lien peut devenir très enrichissant.`
    : score >= 45
    ? `${p1Name} et ${p2Name} ont des tempéraments qui peuvent se stimuler mutuellement, même si cela passe parfois par des ajustements. Leurs différences sont réelles mais peuvent aussi devenir une source de complémentarité si elles sont accueillies plutôt que combattues. La clé de ce lien réside dans la communication et la patience.`
    : `La dynamique entre ${p1Name} et ${p2Name} demande un effort conscient pour trouver un terrain commun. Leurs tempéraments suffisamment différents pour créer des incompréhensions, mais chaque défi est aussi une opportunité d'apprendre. Avec de la bienveillance et de la clarté, ce lien peut évoluer positivement.`;

  const dynPara = score >= 60
    ? `Cette relation fonctionne davantage sur la complémentarité que sur la similitude. ${p1Name} et ${p2Name} s'apportent mutuellement des perspectives différentes qui enrichissent chacun à sa façon.`
    : `La dynamique entre ${p1Name} et ${p2Name} invite à une forme d'apprentissage mutuel. Leurs différences, bien que parfois source de friction, sont aussi ce qui rend ce lien unique et porteur de sens.`;

  const dynPoints = [
    positive[0] ?? genericPos[0],
    negative[0]
      ? 'Ce qui peut sembler être un défi est souvent ce qui les invite à grandir l\'un grâce à l\'autre.'
      : 'L\'un apporte ce que l\'autre cherche parfois à développer en lui-même.',
    'Cette relation vous invite chacun à mieux vous connaître en vous confrontant à une autre façon d\'être.',
  ];

  return { resume, greenFlags, redFlags, dynamique: { paragraphe: dynPara, points: dynPoints } };
}
