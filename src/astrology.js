// ── Calcul du score de compatibilité astrologique ──

// ── Utilitaires ──────────────────────────────────────────────────────────────

function getPlanetKey(name) {
  if (!name) return null
  const n = name.toLowerCase()
  if (n.includes('sun') || n.includes('sol')) return 'sun'
  if (n.includes('moon') || n.includes('lune')) return 'moon'
  if (n.includes('venus') || n.includes('vénus')) return 'venus'
  if (n.includes('mars')) return 'mars'
  if (n.includes('mercury') || n.includes('mercure')) return 'mercury'
  if (n.includes('jupiter')) return 'jupiter'
  if (n.includes('saturn') || n.includes('saturne')) return 'saturn'
  if (n.includes('uranus')) return 'uranus'
  if (n.includes('neptune')) return 'neptune'
  if (n.includes('pluto') || n.includes('pluton')) return 'pluto'
  if (n.includes('asc')) return 'asc'
  return null
}

function getAspectKey(name) {
  if (!name) return null
  const n = name.toLowerCase()
  if (n.includes('trine') || n.includes('trigone')) return 'trine'
  if (n.includes('sextile')) return 'sextile'
  if (n.includes('conjunction') || n.includes('conjonction')) return 'conjunction'
  if (n.includes('opposition')) return 'opposition'
  if (n.includes('square') || n.includes('carré')) return 'square'
  if (n.includes('quincunx') || n.includes('quinconce')) return 'quincunx'
  if (n.includes('semisextile') || n.includes('semi-sextile')) return 'semisextile'
  if (n.includes('semisquare') || n.includes('semi-square')) return 'semisquare'
  if (n.includes('sesqui')) return 'sesquisquare'
  return null
}

// ── Tables de référence ───────────────────────────────────────────────────────

// Score de base d'un aspect (delta pur, hors poids planétaire)
const ASPECT_DELTA = {
  trine:        +14,
  sextile:      +9,
  conjunction:  0,    // dépend des planètes (voir ci-dessous)
  opposition:   -3,
  square:       -5,
  quincunx:     -2,
  semisextile:  +3,
  semisquare:   -1,
  sesquisquare: -1,
}

// Pour les conjonctions : delta spécifique selon la paire (ordre canonique)
const CONJ_DELTA = {
  'moon-sun':     +18,  // harmonie fondamentale
  'moon-moon':    +16,  // résonance émotionnelle profonde
  'venus-mars':   +18,  // attraction physique
  'sun-venus':    +14,  // affinité et amour
  'moon-venus':   +12,  // tendresse
  'sun-sun':      +8,   // compréhension mutuelle
  'jupiter-sun':  +10,  // optimisme partagé
  'jupiter-moon': +9,
  'jupiter-venus':+10,
  'asc-sun':      +8,
  'asc-moon':     +8,
  'asc-venus':    +9,
  'mars-mars':    -3,   // conflits
  'saturn-sun':   -5,   // restriction / pression
  'saturn-moon':  -6,   // froid émotionnel
  'saturn-venus': -4,   // distance affective
  'saturn-mars':  -3,
  'pluto-moon':   -4,
  'pluto-sun':    -2,
}

// Appartenance à une dimension (paire canonique → dimension)
// emotional = lune / soleil / asc côté émotionnel
// attraction = vénus / mars / désir
// daily = mercure / communication / quotidien
function getDimension(p1, p2) {
  const pair = [p1, p2].sort().join('-')
  const EMOTIONAL = new Set([
    'moon-sun','moon-moon','asc-moon','moon-venus',
    'moon-mercury','moon-jupiter','moon-saturn'
  ])
  const ATTRACTION = new Set([
    'mars-venus','venus-venus','mars-sun','sun-venus',
    'asc-mars','asc-venus','mars-moon'
  ])
  const DAILY = new Set([
    'mercury-mercury','asc-mercury','sun-sun',
    'asc-asc','mercury-sun','asc-sun',
    'jupiter-mercury','jupiter-sun'
  ])
  if (EMOTIONAL.has(pair))   return 'emotional'
  if (ATTRACTION.has(pair))  return 'attraction'
  if (DAILY.has(pair))       return 'daily'
  return 'other'
}

// Élément de chaque signe
const ELEMENT = {
  Aries:'fire', Leo:'fire', Sagittarius:'fire',
  Taurus:'earth', Virgo:'earth', Capricorn:'earth',
  Gemini:'air', Libra:'air', Aquarius:'air',
  Cancer:'water', Scorpio:'water', Pisces:'water',
}

// Compatibilité élémentaire : delta ajouté au score de base
const ELEMENT_BONUS = {
  'air-fire':0, 'fire-air':0,   // +0 (calculé via clé triée)
  'fire-fire':-2,
  'air-air':  +2,
  'earth-earth':+2,
  'water-water':+3,
  'earth-water':+5, 'water-earth':+5,
  'air-fire':+4,    'fire-air':+4,
  'fire-earth':-5,  'earth-fire':-5,
  'fire-water':-6,  'water-fire':-6,
  'air-water':-2,   'water-air':-2,
  'air-earth':-3,   'earth-air':-3,
}

function elementBonus(sign1, sign2) {
  const e1 = ELEMENT[sign1], e2 = ELEMENT[sign2]
  if (!e1 || !e2) return 0
  const key = [e1, e2].join('-')
  return ELEMENT_BONUS[key] ?? 0
}

// ── Score principal ───────────────────────────────────────────────────────────

export function calculateScore(aspects, synData) {
  if (!aspects || aspects.length === 0) return 50

  // Accumulation par dimension
  const dims = { emotional: [], attraction: [], daily: [], other: [] }

  for (const aspect of aspects) {
    const p1 = getPlanetKey(aspect.p1_name || aspect.p1 || aspect.point1 || aspect.first_point)
    const p2 = getPlanetKey(aspect.p2_name || aspect.p2 || aspect.point2 || aspect.second_point)
    const at = getAspectKey(aspect.aspect || aspect.type || aspect.name || aspect.aspect_name)

    if (!p1 || !p2 || !at) continue

    let delta = ASPECT_DELTA[at] ?? 0

    if (at === 'conjunction') {
      const pair = [p1, p2].sort().join('-')
      delta = CONJ_DELTA[pair] ?? +4  // conjonction neutre légèrement positive
    }

    // Orbe : réduit le delta si aspect large
    const orb = parseFloat(aspect.orbit ?? aspect.orb ?? aspect.diff ?? 5)
    const orbMult = orb < 1.5 ? 1.3 : orb < 3 ? 1.0 : orb < 6 ? 0.7 : 0.4

    const weightedDelta = delta * orbMult
    const dim = getDimension(p1, p2)
    dims[dim].push(weightedDelta)
  }

  // Score par dimension = moyenne des deltas (ou 0 si vide)
  function dimScore(arr) {
    if (!arr.length) return 0
    return arr.reduce((a, b) => a + b, 0) / arr.length
  }

  const emotionalRaw  = dimScore(dims.emotional)
  const attractionRaw = dimScore(dims.attraction)
  const dailyRaw      = dimScore(dims.daily)
  const otherRaw      = dimScore(dims.other)

  // Pondération des dimensions
  // Si une dimension est vide, son poids est redirigé sur "other"
  const hasEmotional  = dims.emotional.length > 0
  const hasAttraction = dims.attraction.length > 0
  const hasDaily      = dims.daily.length > 0

  const wE = hasEmotional  ? 0.38 : 0
  const wA = hasAttraction ? 0.35 : 0
  const wD = hasDaily      ? 0.17 : 0
  const wO = 1 - wE - wA - wD

  const compositeRaw = emotionalRaw * wE + attractionRaw * wA + dailyRaw * wD + otherRaw * wO

  // Bonus élémentaire (Soleil × Lune entre les deux personnes)
  let elemBonus = 0
  try {
    const p1pl = synData?.first_subject?.planets  || {}
    const p2pl = synData?.second_subject?.planets || {}
    if (p1pl.sun?.sign && p2pl.sun?.sign)   elemBonus += elementBonus(p1pl.sun.sign,  p2pl.sun.sign)  * 0.5
    if (p1pl.moon?.sign && p2pl.moon?.sign) elemBonus += elementBonus(p1pl.moon.sign, p2pl.moon.sign) * 0.5
    if (p1pl.sun?.sign && p2pl.moon?.sign)  elemBonus += elementBonus(p1pl.sun.sign,  p2pl.moon.sign) * 0.3
    if (p2pl.sun?.sign && p1pl.moon?.sign)  elemBonus += elementBonus(p2pl.sun.sign,  p1pl.moon.sign) * 0.3
  } catch { /* ignorer si data absente */ }

  const total = compositeRaw + elemBonus

  // Ramène à 0–100 : base 60, clamp entre 20 et 97
  const score = Math.round(60 + total)
  return Math.min(97, Math.max(20, score))
}

// ── Traduction des aspects en langage humain ──────────────────────────────────

// Paires triées alphabétiquement (ex: 'mercury' < 'moon', 'jupiter' < 'mars')
const PAIR_TRANSLATIONS = {
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
  'mars-saturn':     { harmonic: 'L\'un apporte de la rigueur là où l\'autre apporte de l\'élan — une combinaison complémentaire.', discordant: 'L\'énergie de l\'un peut parfois être freinée ou mal comprise par l\'autre.' },
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
}

function isHarmonicAspect(p1, p2, aspectType) {
  if (['trine', 'sextile', 'semisextile'].includes(aspectType)) return true
  if (['square', 'opposition', 'semisquare', 'sesquisquare'].includes(aspectType)) return false
  if (aspectType === 'conjunction') {
    const pair = [p1, p2].sort().join('-')
    const delta = CONJ_DELTA[pair] ?? 4
    return delta > 0
  }
  return null // quincunx = neutre, ignoré
}

export function translateAspectsToHuman(aspects) {
  const PLANET_WEIGHT = { sun:5, moon:5, venus:4, mars:4, asc:4, mercury:2, jupiter:2, saturn:3, uranus:1, neptune:1, pluto:2 }
  const positive = [], negative = []
  const usedKeys = new Set()

  const sorted = aspects.map(a => {
    const p1 = getPlanetKey(a.p1_name || a.p1 || a.point1 || a.first_point)
    const p2 = getPlanetKey(a.p2_name || a.p2 || a.point2 || a.second_point)
    const at = getAspectKey(a.aspect || a.type || a.name || a.aspect_name)
    if (!p1 || !p2 || !at) return null
    return { p1, p2, at, weight: (PLANET_WEIGHT[p1] || 1) + (PLANET_WEIGHT[p2] || 1) }
  }).filter(Boolean).sort((a, b) => b.weight - a.weight)

  for (const { p1, p2, at } of sorted) {
    const pair = [p1, p2].sort().join('-')
    const tr = PAIR_TRANSLATIONS[pair]
    if (!tr) continue
    const harmonic = isHarmonicAspect(p1, p2, at)
    if (harmonic === null) continue
    const key = `${pair}-${harmonic ? 'h' : 'd'}`
    if (usedKeys.has(key)) continue
    usedKeys.add(key)
    if (harmonic) positive.push(tr.harmonic)
    else negative.push(tr.discordant)
  }

  return { positive, negative }
}

export function generateLocalContent(aspects, synData, p1Name, p2Name, score) {
  const { positive, negative } = translateAspectsToHuman(aspects)

  const genericPositive = [
    'Vous êtes capables de vous soutenir mutuellement dans les moments importants.',
    'Il existe entre vous une base de respect mutuel qui peut traverser les épreuves.',
    'Votre relation a le potentiel de vous faire grandir chacun à votre façon.',
    'Vous avez tendance à vous comprendre même dans les situations complexes.',
  ]
  const genericNegative = [
    'Comme dans toute relation, certains moments nécessiteront plus d\'écoute et de patience.',
    'Des attentes non exprimées pourraient créer des tensions si elles s\'accumulent.',
    'Vos différences demandent parfois un effort conscient pour être comprises plutôt que jugées.',
    'L\'un peut parfois interpréter les réactions de l\'autre plus négativement qu\'elles ne le sont réellement.',
  ]

  const greenFlags = [...positive]
  const redFlags = [...negative]
  let gi = 0; while (greenFlags.length < 3) greenFlags.push(genericPositive[gi++ % genericPositive.length])
  let ri = 0; while (redFlags.length < 3) redFlags.push(genericNegative[ri++ % genericNegative.length])
  greenFlags.length = Math.min(greenFlags.length, 5)
  redFlags.length = Math.min(redFlags.length, 5)

  let resume
  if (score >= 75) {
    resume = `${p1Name} et ${p2Name} partagent une dynamique relationnelle particulièrement fluide. Leurs façons d'être se complètent sur des points essentiels, créant une base solide pour se comprendre et s'appuyer mutuellement. Cette relation a tout pour évoluer dans un climat de confiance et de croissance partagée.`
  } else if (score >= 60) {
    resume = `La relation entre ${p1Name} et ${p2Name} est riche en potentiel, même si elle demande une certaine conscience des différences de chacun. Leurs forces se rejoignent sur plusieurs points importants, tout en laissant de la place pour apprendre de l'autre. Avec un peu d'attention mutuelle, ce lien peut devenir très enrichissant.`
  } else if (score >= 45) {
    resume = `${p1Name} et ${p2Name} ont des tempéraments qui peuvent se stimuler mutuellement, même si cela passe parfois par des ajustements. Leurs différences sont réelles, mais elles peuvent aussi devenir une source de complémentarité si elles sont accueillies plutôt que combattues. La clé de ce lien réside dans la communication et la patience.`
  } else {
    resume = `La dynamique entre ${p1Name} et ${p2Name} demande un effort conscient pour trouver un terrain commun. Leurs tempéraments sont suffisamment différents pour créer des incompréhensions, mais chaque défi est aussi une opportunité d'apprendre quelque chose sur soi-même. Avec de la bienveillance et de la clarté, ce lien peut évoluer positivement.`
  }

  const dynamiquePoints = [
    positive[0] || genericPositive[0],
    negative[0] ? 'Ce qui peut sembler être un défi est souvent ce qui les invite à grandir l\'un grâce à l\'autre.' : 'L\'un apporte ce que l\'autre cherche parfois à développer en lui-même.',
    'Cette relation vous invite chacun à mieux vous connaître en vous confrontant à une autre façon d\'être.',
  ]

  const dynamiquePara = score >= 60
    ? `Cette relation fonctionne davantage sur la complémentarité que sur la similitude. ${p1Name} et ${p2Name} s'apportent mutuellement des perspectives différentes qui enrichissent chacun à sa façon.`
    : `La dynamique entre ${p1Name} et ${p2Name} invite à une forme d'apprentissage mutuel. Leurs différences, bien que parfois source de friction, sont aussi ce qui rend ce lien unique et porteur de sens.`

  return { resume, greenFlags, redFlags, dynamique: { paragraphe: dynamiquePara, points: dynamiquePoints } }
}

// ── Résumé textuel pour le prompt IA ─────────────────────────────────────────

const SIGNS_FR = {
  Aries:'Bélier', Taurus:'Taureau', Gemini:'Gémeaux', Cancer:'Cancer',
  Leo:'Lion', Virgo:'Vierge', Libra:'Balance', Scorpio:'Scorpion',
  Sagittarius:'Sagittaire', Capricorn:'Capricorne', Aquarius:'Verseau', Pisces:'Poissons',
  Ari:'Bélier', Tau:'Taureau', Gem:'Gémeaux', Can:'Cancer', Vir:'Vierge',
  Lib:'Balance', Sco:'Scorpion', Sag:'Sagittaire', Cap:'Capricorne',
  Aqu:'Verseau', Pis:'Poissons',
}

export function buildAstroSummary(synData, p1Name, p2Name) {
  const aspects  = synData?.aspects || []
  const p1pl = synData?.first_subject?.planets  || {}
  const p2pl = synData?.second_subject?.planets || {}

  const PLANETS_FR = {
    sun:'Soleil', moon:'Lune', mercury:'Mercure', venus:'Vénus',
    mars:'Mars', jupiter:'Jupiter', saturn:'Saturne', asc:'Ascendant',
  }
  const sign = s => SIGNS_FR[s] || s

  function profile(name, pl) {
    const parts = []
    if (pl.sun?.sign)     parts.push(`Soleil ${sign(pl.sun.sign)}`)
    if (pl.moon?.sign)    parts.push(`Lune ${sign(pl.moon.sign)}`)
    if (pl.venus?.sign)   parts.push(`Vénus ${sign(pl.venus.sign)}`)
    if (pl.mars?.sign)    parts.push(`Mars ${sign(pl.mars.sign)}`)
    if (pl.mercury?.sign) parts.push(`Mercure ${sign(pl.mercury.sign)}`)
    if (pl.ascendant?.sign || pl.asc?.sign) parts.push(`Ascendant ${sign(pl.ascendant?.sign || pl.asc?.sign)}`)
    return parts.length ? `${name} : ${parts.join(', ')}` : `${name} : données insuffisantes`
  }

  // Aspects clés (limités aux 10 plus significatifs)
  const ASPECT_FR = {
    conjunction:'conjonction', trine:'trigone', sextile:'sextile',
    opposition:'opposition', square:'carré', quincunx:'quinconce',
  }
  const PLANET_WEIGHT = { sun:5, moon:5, venus:4, mars:4, asc:4, mercury:2, jupiter:2, saturn:3 }

  const scored = aspects.map(a => {
    const p1 = getPlanetKey(a.p1_name || a.p1 || a.point1)
    const p2 = getPlanetKey(a.p2_name || a.p2 || a.point2)
    const at = getAspectKey(a.aspect || a.type || a.name)
    if (!p1 || !p2 || !at) return null
    const importance = (PLANET_WEIGHT[p1] || 1) + (PLANET_WEIGHT[p2] || 1)
    const delta = Math.abs(ASPECT_DELTA[at] ?? 0)
    return { p1, p2, at, importance, delta, raw: a }
  }).filter(Boolean)
    .sort((a, b) => (b.importance + b.delta) - (a.importance + a.delta))
    .slice(0, 10)

  const aspectLines = scored.map(({ p1, p2, at, raw }) => {
    const orb = parseFloat(raw.orbit ?? raw.orb ?? raw.diff ?? '?').toFixed(1)
    return `  - ${PLANETS_FR[p1]||p1} de ${p1Name} en ${ASPECT_FR[at]||at} avec ${PLANETS_FR[p2]||p2} de ${p2Name} (orbe ${orb}°)`
  })

  // Compatibilité élémentaire
  const elemLines = []
  if (p1pl.sun?.sign && p2pl.sun?.sign) {
    const e1 = ELEMENT[p1pl.sun.sign], e2 = ELEMENT[p2pl.sun.sign]
    if (e1 && e2) elemLines.push(`  - Soleils : ${sign(p1pl.sun.sign)} (${e1}) × ${sign(p2pl.sun.sign)} (${e2})`)
  }
  if (p1pl.moon?.sign && p2pl.moon?.sign) {
    const e1 = ELEMENT[p1pl.moon.sign], e2 = ELEMENT[p2pl.moon.sign]
    if (e1 && e2) elemLines.push(`  - Lunes : ${sign(p1pl.moon.sign)} (${e1}) × ${sign(p2pl.moon.sign)} (${e2})`)
  }

  return [
    profile(p1Name, p1pl),
    profile(p2Name, p2pl),
    '',
    'Éléments (Soleil/Lune) :',
    ...elemLines,
    '',
    'Aspects clés de synastrie :',
    ...aspectLines,
  ].join('\n')
}

// ── Extraction des chartes natales ────────────────────────────────────────────

const PLANETS_CHART = [
  { key:'sun',     symbol:'☉', label:'Soleil'   },
  { key:'moon',    symbol:'☽', label:'Lune'     },
  { key:'mercury', symbol:'☿', label:'Mercure'  },
  { key:'venus',   symbol:'♀', label:'Vénus'    },
  { key:'mars',    symbol:'♂', label:'Mars'     },
  { key:'jupiter', symbol:'♃', label:'Jupiter'  },
  { key:'saturn',  symbol:'♄', label:'Saturne'  },
]

export function extractCharts(synData, p1Name, p2Name) {
  const p1raw = synData?.first_subject || {}
  const p2raw = synData?.second_subject || {}

  // Les planètes peuvent être sous .planets ou directement sur le sujet
  function resolvePlanets(raw) {
    const sub = raw.planets
    if (sub && typeof sub === 'object' && !Array.isArray(sub) && Object.keys(sub).length > 0) return sub
    return raw
  }

  // Cherche une planète en essayant minuscule, Majuscule et MAJUSCULE
  function findPlanet(pl, key) {
    return pl[key]
      || pl[key.charAt(0).toUpperCase() + key.slice(1)]
      || pl[key.toUpperCase()]
      || null
  }

  // Récupère le nom du signe depuis plusieurs champs possibles
  function getSign(p) {
    return p?.sign || p?.sign_name || p?.zodiac || p?.zodiac_sign || null
  }

  // Parse le numéro de maison depuis plusieurs formats (1, "1", "1st", "I")
  function parseHouse(p) {
    const raw = p?.house ?? p?.house_num ?? p?.house_number ?? p?.house_name ?? null
    if (raw === null || raw === undefined) return null
    const n = parseInt(String(raw))
    return isNaN(n) ? null : n
  }

  function buildRows(pl) {
    const rows = []
    for (const { key, symbol } of PLANETS_CHART) {
      const p = findPlanet(pl, key)
      const signName = getSign(p)
      if (!signName) continue
      rows.push({ symbol, sign: SIGNS_FR[signName] || signName, house: parseHouse(p) })
    }
    const asc = findPlanet(pl, 'ascendant') || findPlanet(pl, 'asc')
    const ascSign = getSign(asc)
    if (ascSign) {
      rows.push({ symbol:'↑', sign: SIGNS_FR[ascSign] || ascSign, house: parseHouse(asc) })
    }
    return rows
  }

  const p1pl = resolvePlanets(p1raw)
  const p2pl = resolvePlanets(p2raw)

  return {
    p1: { name: p1Name, rows: buildRows(p1pl) },
    p2: { name: p2Name, rows: buildRows(p2pl) },
  }
}
