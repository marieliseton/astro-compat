import type { Aspect, StructuredContent } from './types';

interface Translation {
  harmonic: string;
  discordant: string;
}

// Clés triées alphabétiquement (ex: 'mercury' < 'moon', 'jupiter' < 'mars').
// 'ascendant' → 'asc', 'northNode' → 'node' (voir normKey).
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
  'pluto-venus':     { harmonic: 'Vos liens ont tendance à devenir intenses et profonds plutôt que superficiels.', discordant: 'L\'attachement peut parfois virer au tout-ou-rien, avec une intensité difficile à doser.' },
  'mars-pluto':      { harmonic: 'Vous partagez une vraie capacité à vous investir à fond dans ce que vous entreprenez.', discordant: 'Les rapports de force peuvent monter vite quand chacun campe sur ses positions.' },
  'pluto-saturn':    { harmonic: 'Vous savez tenir bon ensemble dans la durée, même quand c\'est exigeant.', discordant: 'Des bras de fer peuvent s\'installer et durer si aucun des deux ne lâche.' },
  'asc-mercury':     { harmonic: 'Vos échanges sont naturellement fluides et stimulants pour les deux.', discordant: 'La façon dont l\'un se présente peut parfois être mal interprétée par l\'autre.' },
  'asc-asc':         { harmonic: 'Vous avez une belle aisance à vous retrouver et à interagir naturellement.', discordant: 'Vos façons d\'aborder les autres et les situations peuvent parfois différer fortement.' },
  'mercury-saturn':  { harmonic: 'L\'un apporte de la rigueur et de la profondeur aux échanges de l\'autre.', discordant: 'L\'un peut parfois ressentir que l\'autre n\'est pas pleinement disponible dans les échanges.' },
  // ── Nœud nord (axe de croissance) — alimente surtout « évolution » ─────────
  'node-sun':        { harmonic: 'L\'un aide l\'autre à aller dans le sens de ce qui compte vraiment pour lui.', discordant: 'Vos trajectoires de vie ne pointent pas spontanément dans la même direction.' },
  'moon-node':       { harmonic: 'Vous touchez assez vite à quelque chose d\'important l\'un pour l\'autre, au-delà du quotidien.', discordant: 'Ce que l\'un recherche au fond ne coïncide pas toujours avec ce que l\'autre attend.' },
  'node-venus':      { harmonic: 'Cette relation a de quoi faire évoluer votre façon d\'aimer et d\'apprécier les choses.', discordant: 'Vos envies profondes peuvent diverger, ce qui demande des ajustements sur la durée.' },
  'jupiter-node':    { harmonic: 'Ensemble, vous avez tendance à ouvrir des portes et à voir plus grand.', discordant: 'Vos idées de ce vers quoi tendre peinent parfois à se rejoindre.' },
  'node-saturn':     { harmonic: 'Cette relation peut vous faire mûrir et poser des bases solides sur le long terme.', discordant: 'Le sérieux de l\'un peut peser sur l\'élan de l\'autre avant de devenir constructif.' },
  'mars-node':       { harmonic: 'Vous vous donnez mutuellement l\'impulsion d\'avancer vers vos objectifs.', discordant: 'Vos manières d\'agir peuvent se contrarier avant de trouver leur rythme.' },
};

// 'ascendant' → 'asc', 'northNode' → 'node' pour matcher les clés de TRANSLATIONS.
const normKey = (k: string): string =>
  k === 'ascendant' ? 'asc' : k === 'northNode' ? 'node' : k;

function pairKey(asp: Aspect): string {
  return [normKey(String(asp.planetA)), normKey(String(asp.planetB))].sort().join('-');
}

function phraseFor(asp: Aspect): string | null {
  const tr = TRANSLATIONS[pairKey(asp)];
  if (!tr) return null;
  return asp.harmonic ? tr.harmonic : tr.discordant;
}

// Conservé pour compatibilité (vue globale positive/négative).
export function interpretAspects(aspects: Aspect[]): { positive: string[]; negative: string[] } {
  const positive: string[] = [];
  const negative: string[] = [];
  const used = new Set<string>();

  for (const asp of aspects) {
    const pair = pairKey(asp);
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

// ── Catégorisation : chaque facette est dérivée de corps DIFFÉRENTS ───────────
// harmony   : Vénus / Lune / Soleil, liens fluides (trigone, sextile, conj. douce)
// tension   : Mars / Saturne / Pluton, liens durs (carré, opposition)
// dynamic   : Mercure / Soleil / Lune (communication & fonctionnement quotidien)
// evolution : Saturne / Jupiter / Nœud nord (apprentissage & croissance)
const HARMONY_BODIES = new Set(['venus', 'moon', 'sun']);
const TENSION_BODIES = new Set(['mars', 'saturn', 'pluto']);
const DYNAMIC_BODIES = new Set(['mercury', 'sun', 'moon']);
// évolution = Jupiter & Nœud nord (tout lien) + Saturne CONSTRUCTIF (lien fluide).
// Défini dans la boucle car ce n'est pas un simple « involves ».

export interface CategoryEvidence {
  harmony: string[];
  tension: string[];
  dynamic: string[];
  evolution: string[];
}

const MAX_PER_CAT = 5;

// À partir des aspects de synastrie (triés par justesse décroissante), répartit
// des indices en langage clair dans les 4 facettes. Chaque facette ne pioche
// que dans SES corps et SON type de lien → 4 angles réellement différents.
export function categorizeEvidence(aspects: Aspect[]): CategoryEvidence {
  const out: CategoryEvidence = { harmony: [], tension: [], dynamic: [], evolution: [] };
  const seen = {
    harmony: new Set<string>(), tension: new Set<string>(),
    dynamic: new Set<string>(), evolution: new Set<string>(),
  };

  const add = (cat: keyof CategoryEvidence, dedupe: string, phrase: string | null) => {
    if (!phrase || out[cat].length >= MAX_PER_CAT || seen[cat].has(dedupe)) return;
    seen[cat].add(dedupe);
    out[cat].push(phrase);
  };

  for (const asp of aspects) {
    const a = normKey(String(asp.planetA));
    const b = normKey(String(asp.planetB));
    const pair = [a, b].sort().join('-');
    const tr = TRANSLATIONS[pair];
    if (!tr) continue;

    const involves = (s: Set<string>) => s.has(a) || s.has(b);
    const both = (s: Set<string>) => s.has(a) && s.has(b);
    const isHard = asp.aspect === 'square' || asp.aspect === 'opposition';

    // HARMONIE : liens fluides touchant Vénus/Lune/Soleil
    if (asp.harmonic && involves(HARMONY_BODIES)) add('harmony', pair, tr.harmonic);
    // TENSION : carrés & oppositions touchant Mars/Saturne/Pluton
    if (isHard && involves(TENSION_BODIES)) add('tension', pair, tr.discordant);
    // DYNAMIQUE : Mercure/Soleil/Lune entre eux (manière d'interagir au quotidien)
    if (both(DYNAMIC_BODIES)) add('dynamic', `${pair}-${asp.harmonic ? 'h' : 'd'}`, phraseFor(asp));
    // ÉVOLUTION : croissance — Jupiter & Nœud nord (tout lien) + Saturne fluide.
    // (Les liens DURS à Saturne/Pluton restent en TENSION → pas de doublon.)
    const growth = a === 'jupiter' || b === 'jupiter' || a === 'node' || b === 'node'
      || ((a === 'saturn' || b === 'saturn') && asp.harmonic);
    if (growth) add('evolution', `${pair}-${asp.harmonic ? 'h' : 'd'}`, phraseFor(asp));
  }

  return out;
}

// ── Fallback local : 4 textes en deux paragraphes, ancrés dans les indices ─────
// Même format que la sortie Gemini : "para1\n\npara2" par facette.
export function buildLocalContent(
  aspects: Aspect[],
  p1Name: string,
  p2Name: string,
  score: number,
): StructuredContent {
  const ev = categorizeEvidence(aspects);
  const hi = score >= 60;
  const mid = score >= 50;

  const used = new Set<string>();
  const pickArr = (arr: string[], n: number): string[] => {
    const out: string[] = [];
    for (const s of arr) {
      if (out.length >= n) break;
      if (used.has(s)) continue;
      used.add(s);
      out.push(s);
    }
    return out;
  };
  const two = (arr: string[]) => pickArr(arr, 2);
  const one = (arr: string[]) => pickArr(arr, 1)[0] ?? '';

  // HARMONIE
  const h = two(ev.harmony);
  const harmonyP1 = h.length
    ? `${hi ? `${p1Name} et ${p2Name}, il y a un vrai socle commun.` : `Entre ${p1Name} et ${p2Name}, l'évidence ne saute pas aux yeux, mais le socle existe.`} ${h.join(' ')}`
    : `Les affinités entre ${p1Name} et ${p2Name} se construisent par petites touches plutôt que d'emblée. C'est dans la durée et les détails partagés que le lien prend.`;
  const h2 = one(ev.harmony);
  const harmonyP2 = h2
    ? `${h2} Ce qui rapproche ${p1Name} et ${p2Name} ne s'épuise pas — il s'étoffe avec le temps.`
    : `Ce que vous partagez ne se résume pas à des affinités de surface. La solidité de ce lien tient à une façon similaire d'aborder ce qui compte, même quand les manières de l'exprimer diffèrent.`;
  const harmony = `${harmonyP1}\n\n${harmonyP2}`;

  // TENSION
  const t = two(ev.tension);
  const tensionP1 = t.length
    ? `${mid ? `Rien d'insurmontable entre ${p1Name} et ${p2Name}, mais voilà où ça frotte.` : `Autant le dire : ${p1Name} et ${p2Name} ont du sport.`} ${t.join(' ')}`
    : `Peu de heurts frontaux entre ${p1Name} et ${p2Name} : les frictions, quand elles viennent, tiennent surtout à des différences de rythme qu'il faut apprendre à doser.`;
  const t2 = one(ev.tension);
  const tensionP2 = t2
    ? `${t2} Nommer ces tensions clairement, plutôt que de les contourner, reste le chemin le plus court pour les désamorcer.`
    : `La bonne nouvelle : ces tensions ne sont pas structurelles. Elles apparaissent surtout dans les moments de pression — des contextes où n'importe quel duo peut se frotter. Un peu d'humour sur les désaccords aide.`;
  const tension = `${tensionP1}\n\n${tensionP2}`;

  // DYNAMIQUE
  const d = two(ev.dynamic);
  const dynamicP1 = d.length
    ? `Au quotidien, ${p1Name} et ${p2Name} ont leur propre façon de tourner. ${d.join(' ')}`
    : `${p1Name} et ${p2Name} se cherchent un peu avant de trouver leur tempo : une fois les rôles posés, l'interaction devient nettement plus fluide.`;
  const d2 = one(ev.dynamic);
  const dynamicP2 = d2
    ? `${d2} Ce rythme une fois trouvé, vous avancez avec une vraie efficacité.`
    : `Ce n'est pas tant ce que vous faites ensemble qui compte, mais comment vous le faites. ${p1Name} et ${p2Name} fonctionnent mieux quand chacun sait ce que l'autre apporte — et ne cherche pas à le corriger.`;
  const dynamic = `${dynamicP1}\n\n${dynamicP2}`;

  // ÉVOLUTION
  const e = two(ev.evolution);
  const evolutionP1 = e.length
    ? `Ce que cette relation peut apporter à ${p1Name} et ${p2Name} ne se voit pas forcément tout de suite. ${e.join(' ')}`
    : `Le potentiel ici est dans l'apprentissage : ${p1Name} et ${p2Name} se font mûrir mutuellement, à condition d'accueillir ce que l'autre fait différemment.`;
  const e2 = one(ev.evolution);
  const evolutionP2 = e2
    ? `${e2} C'est souvent ce type de relation qui laisse une trace durable.`
    : `Ce lien a quelque chose qui construit — pas forcément dans le fracas, mais dans la profondeur. Ce que ${p1Name} et ${p2Name} apprennent l'un de l'autre dépasse la relation elle-même.`;
  const evolution = `${evolutionP1}\n\n${evolutionP2}`;

  return { harmony, tension, dynamic, evolution };
}
