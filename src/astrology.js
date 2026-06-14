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

// ── Résumé textuel pour le prompt IA ─────────────────────────────────────────

export function buildAstroSummary(synData, p1Name, p2Name) {
  const aspects  = synData?.aspects || []
  const p1pl = synData?.first_subject?.planets  || {}
  const p2pl = synData?.second_subject?.planets || {}

  const SIGNS_FR = {
    Aries:'Bélier', Taurus:'Taureau', Gemini:'Gémeaux', Cancer:'Cancer',
    Leo:'Lion', Virgo:'Vierge', Libra:'Balance', Scorpio:'Scorpion',
    Sagittarius:'Sagittaire', Capricorn:'Capricorne', Aquarius:'Verseau', Pisces:'Poissons',
    Ari:'Bélier', Tau:'Taureau', Gem:'Gémeaux', Can:'Cancer', Vir:'Vierge',
    Lib:'Balance', Sco:'Scorpion', Sag:'Sagittaire', Cap:'Capricorne',
    Aqu:'Verseau', Pis:'Poissons',
  }
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
