// ── Calcul du score de compatibilité astrologique ──
// Basé sur les aspects de synastrie retournés par l'Astrologer API

// Poids des planètes dans la synastrie (plus haut = plus important)
const PLANET_WEIGHTS = {
  sun: 5,
  moon: 5,
  venus: 4,
  mars: 3,
  ascendant: 4,
  mercury: 2,
  jupiter: 2,
  saturn: 2,
  uranus: 1,
  neptune: 1,
  pluto: 1,
}

// Impact des aspects (positif = harmonieux, négatif = tendu)
const ASPECT_SCORES = {
  conjunction: 0.8,   // Conjonction : intense, peut être positif ou négatif selon planètes
  trine: 1.0,         // Trigone : très harmonieux
  sextile: 0.7,       // Sextile : harmonieux
  opposition: -0.5,   // Opposition : tension mais attraction
  square: -0.8,       // Carré : friction forte
  quincunx: -0.3,     // Quinconce : léger inconfort
  semisextile: 0.2,   // Demi-sextile : léger positif
  semisquare: -0.3,   // Demi-carré : légère tension
  sesquisquare: -0.3, // Sesqui-carré : légère tension
}

// Conjonctions bénéfiques entre planètes spécifiques
const BENEFICIAL_CONJUNCTIONS = [
  ['venus', 'mars'],    // Attraction physique forte
  ['venus', 'sun'],     // Harmonie et amour
  ['venus', 'moon'],    // Tendresse profonde
  ['sun', 'moon'],      // Complémentarité fondamentale
  ['moon', 'moon'],     // Résonance émotionnelle
  ['venus', 'jupiter'], // Expansion et plaisir
  ['sun', 'jupiter'],   // Optimisme partagé
]

// Conjonctions difficiles
const DIFFICULT_CONJUNCTIONS = [
  ['saturn', 'sun'],    // Restriction
  ['saturn', 'moon'],   // Froid émotionnel
  ['mars', 'mars'],     // Conflits
  ['saturn', 'venus'],  // Distancement affectif
]

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
  if (n.includes('asc')) return 'ascendant'
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

export function calculateScore(aspects) {
  if (!aspects || aspects.length === 0) return 50

  let totalScore = 0
  let totalWeight = 0

  for (const aspect of aspects) {
    const p1 = getPlanetKey(aspect.p1_name || aspect.p1 || aspect.point1 || aspect.first_point)
    const p2 = getPlanetKey(aspect.p2_name || aspect.p2 || aspect.point2 || aspect.second_point)
    const aspectType = getAspectKey(aspect.aspect || aspect.type || aspect.name || aspect.aspect_name)

    if (!p1 || !p2 || !aspectType) continue

    const w1 = PLANET_WEIGHTS[p1] || 1
    const w2 = PLANET_WEIGHTS[p2] || 1
    const weight = (w1 + w2) / 2

    let aspectScore = ASPECT_SCORES[aspectType] ?? 0

    // Ajustement pour les conjonctions selon les planètes impliquées
    if (aspectType === 'conjunction') {
      const pair = [p1, p2].sort()
      const isBeneficial = BENEFICIAL_CONJUNCTIONS.some(b => {
        const bs = [...b].sort()
        return bs[0] === pair[0] && bs[1] === pair[1]
      })
      const isDifficult = DIFFICULT_CONJUNCTIONS.some(d => {
        const ds = [...d].sort()
        return ds[0] === pair[0] && ds[1] === pair[1]
      })
      if (isBeneficial) aspectScore = 1.0
      else if (isDifficult) aspectScore = -0.7
      else aspectScore = 0.3
    }

    // Bonus si orbe serré (aspect plus fort)
    const orb = parseFloat(aspect.orbit ?? aspect.orb ?? aspect.diff ?? 5)
    const orbMultiplier = orb < 2 ? 1.3 : orb < 4 ? 1.0 : 0.7

    totalScore += aspectScore * weight * orbMultiplier
    totalWeight += weight * orbMultiplier
  }

  if (totalWeight === 0) return 50

  // Normalise entre 0 et 100
  const raw = totalScore / totalWeight  // entre -1 et +1
  const normalized = Math.round(((raw + 1) / 2) * 100)
  return Math.min(95, Math.max(15, normalized))
}

export function buildAstroSummary(synData, p1Name, p2Name) {
  const aspects = synData?.aspects || []
  const p1Planets = synData?.first_subject?.planets || {}
  const p2Planets = synData?.second_subject?.planets || {}

  const SIGNS_FR = {
    Ari:'Bélier', Tau:'Taureau', Gem:'Gémeaux', Can:'Cancer', Leo:'Lion', Vir:'Vierge',
    Lib:'Balance', Sco:'Scorpion', Sag:'Sagittaire', Cap:'Capricorne', Aqu:'Verseau', Pis:'Poissons',
    Aries:'Bélier', Taurus:'Taureau', Gemini:'Gémeaux', Cancer:'Cancer', Virgo:'Vierge',
    Libra:'Balance', Scorpio:'Scorpion', Sagittarius:'Sagittaire', Capricorn:'Capricorne', Aquarius:'Verseau', Pisces:'Poissons',
  }
  const PLANETS_FR = {
    sun:'Soleil', moon:'Lune', mercury:'Mercure', venus:'Vénus', mars:'Mars',
    jupiter:'Jupiter', saturn:'Saturne', ascendant:'Ascendant',
  }
  const sign = (s) => SIGNS_FR[s] || s

  function profile(name, pl) {
    const parts = []
    if (pl.sun?.sign) parts.push(`Soleil en ${sign(pl.sun.sign)}`)
    if (pl.moon?.sign) parts.push(`Lune en ${sign(pl.moon.sign)}`)
    if (pl.mercury?.sign) parts.push(`Mercure en ${sign(pl.mercury.sign)}`)
    if (pl.venus?.sign) parts.push(`Vénus en ${sign(pl.venus.sign)}`)
    if (pl.mars?.sign) parts.push(`Mars en ${sign(pl.mars.sign)}`)
    return `${name} : ${parts.join(', ')}`
  }

  const lines = [profile(p1Name, p1Planets), profile(p2Name, p2Planets), '', 'Liens entre leurs astres :']

  const aspectFR = {
    conjunction:'fusionne avec', trine:'s\'harmonise avec', sextile:'soutient',
    opposition:'s\'oppose à', square:'se heurte à', quincunx:'s\'ajuste à',
  }

  const keyAspects = aspects
    .map(a => {
      const k1 = getPlanetKey(a.p1_name || a.p1 || a.point1)
      const k2 = getPlanetKey(a.p2_name || a.p2 || a.point2)
      const at = getAspectKey(a.aspect || a.type || a.name)
      if (!k1 || !k2 || !at) return null
      const verb = aspectFR[at] || 'rencontre'
      return `Le ${PLANETS_FR[k1]||k1} de ${p1Name} ${verb} le ${PLANETS_FR[k2]||k2} de ${p2Name}`
    })
    .filter(Boolean)
    .slice(0, 8)

  return [...lines, ...keyAspects].join('\n')
}
