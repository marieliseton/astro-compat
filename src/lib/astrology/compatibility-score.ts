import type { Aspect, AspectType } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// SCORE DE COMPATIBILITÉ — échelle absolue, 4 sous-scores de facette
// ═══════════════════════════════════════════════════════════════════════════
// Principe :
//   1. Chaque aspect a une contribution signée =
//        valeur_de_base(type) × serrage_d_orbe(dégressif) × importance(planètes)
//   2. Chaque facette ne somme QUE les aspects touchant SES corps → 4 angles
//      réellement distincts (mêmes corps que la catégorisation des textes).
//   3. La somme brute passe dans une sigmoïde à CONSTANTES FIXES (calibrées une
//      fois pour toutes sur une large population) → échelle absolue : la même
//      paire donne toujours le même score, la distribution s'étale au lieu de
//      se tasser au centre.
//   4. Score global = moyenne pondérée des 4 sous-scores → le chiffre affiché
//      raconte la même histoire que le texte de chaque section.

export type Facet = 'harmony' | 'tension' | 'dynamic' | 'evolution';
export const FACETS: Facet[] = ['harmony', 'tension', 'dynamic', 'evolution'];

// Corps propres à chaque facette (spec) :
//   harmonie  : Vénus · Lune · Soleil
//   tension   : Mars · Saturne · Pluton
//   dynamique : Mercure · Soleil · Lune
//   évolution : Saturne · Jupiter · Nœud nord
const FACET_BODIES: Record<Facet, Set<string>> = {
  harmony:   new Set(['venus', 'moon', 'sun']),
  tension:   new Set(['mars', 'saturn', 'pluto']),
  dynamic:   new Set(['mercury', 'sun', 'moon']),
  evolution: new Set(['saturn', 'jupiter', 'node']),
};

// Poids de chaque facette dans le score global (somme = 1).
// harmonie & tension mènent le ressenti de compatibilité ; dynamique &
// évolution nuancent.
const FACET_WEIGHT: Record<Facet, number> = {
  harmony: 0.34, tension: 0.30, dynamic: 0.20, evolution: 0.16,
};

// ── Sigmoïde de calibration (raw → 0..100), CONSTANTES FIXES ─────────────────
// center  : valeur brute qui tombe vers ~62 (cœur de la population)
// width   : étalement (plus petit = plus contrasté)
// Déterminées empiriquement sur ~600 paires aléatoires (voir audit/calibrate.ts)
// pour viser : couples typiques ~55-70, très bons 80+, faibles <45.
const FACET_CAL: Record<Facet, { center: number; width: number }> = {
  harmony:   { center: -0.525, width: 1.781 },
  tension:   { center: -0.451, width: 1.418 },
  dynamic:   { center: -0.491, width: 1.703 },
  evolution: { center: -0.553, width: 1.378 },
};

// ── Valeur de base signée par type d'aspect (≈ [-1, +1]) ─────────────────────
const ASPECT_BASE: Record<AspectType, number> = {
  trine:       +1.0,
  sextile:     +0.6,
  conjunction: +0.5,   // surchargé par paire ci-dessous
  square:      -0.85,
  opposition:  -1.0,
};

// Polarité de conjonction par paire (clés triées, normalisées ≈ [-1, +1]).
// Une conjonction est contextuelle : Lune-Soleil rapproche fort, Saturne-Lune pèse.
const CONJUNCTION_BASE: Record<string, number> = {
  'moon-sun': +1.0, 'mars-venus': +0.9, 'sun-venus': +0.85, 'moon-venus': +0.8,
  'moon-moon': +0.7, 'jupiter-sun': +0.7, 'jupiter-moon': +0.65, 'sun-sun': +0.5,
  'asc-venus': +0.65, 'asc-sun': +0.5, 'asc-moon': +0.5, 'mercury-mercury': +0.5,
  'mars-mars': -0.2, 'saturn-sun': -0.45, 'moon-saturn': -0.6, 'saturn-venus': -0.4,
  'mars-saturn': -0.3, 'pluto-sun': +0.1, 'moon-pluto': -0.1, 'pluto-venus': +0.2,
  'mars-pluto': -0.2, 'pluto-saturn': -0.3,
};

// Importance relationnelle de chaque corps.
const PLANET_WEIGHT: Record<string, number> = {
  sun: 5, moon: 5, venus: 4, mars: 4, asc: 4,
  mercury: 3, saturn: 3, jupiter: 3, node: 2, pluto: 2,
  uranus: 1, neptune: 1,
};

// Serrage d'orbe DÉGRESSIF : un aspect à 0–1° pèse bien plus qu'à 6–7°.
// tightness = (exact/100)^ORB_EXP, exposant > 1 = décroissance accélérée.
const ORB_EXP = 1.8;

// 'ascendant' → 'asc', 'northNode' → 'node'
const normKey = (k: string): string =>
  k === 'ascendant' ? 'asc' : k === 'northNode' ? 'node' : k;

function aspectBase(asp: Aspect): number {
  if (asp.aspect === 'conjunction') {
    const pair = [normKey(String(asp.planetA)), normKey(String(asp.planetB))].sort().join('-');
    return CONJUNCTION_BASE[pair] ?? +0.4;
  }
  return ASPECT_BASE[asp.aspect];
}

function orbTightness(asp: Aspect): number {
  const t = Math.max(0, Math.min(1, asp.exact / 100));
  return Math.pow(t, ORB_EXP);
}

function planetImportance(asp: Aspect): number {
  const wa = PLANET_WEIGHT[normKey(String(asp.planetA))] ?? 1;
  const wb = PLANET_WEIGHT[normKey(String(asp.planetB))] ?? 1;
  return (wa + wb) / 10; // ≈ 0.4 .. 1.0
}

// Contribution signée d'un aspect (indépendante de la facette). Exporté pour
// que la couche "indices du prompt" classe les aspects avec EXACTEMENT la même
// logique que le score → bullets et score ne peuvent jamais se contredire.
export function aspectContribution(asp: Aspect): number {
  return aspectBase(asp) * orbTightness(asp) * planetImportance(asp);
}

// Corps propres à chaque facette, exporté pour la sélection des indices.
export function facetBodies(f: Facet): Set<string> {
  return FACET_BODIES[f];
}

export function aspectInvolves(asp: Aspect, f: Facet): boolean {
  return involves(asp, FACET_BODIES[f]);
}

function involves(asp: Aspect, bodies: Set<string>): boolean {
  return bodies.has(normKey(String(asp.planetA))) || bodies.has(normKey(String(asp.planetB)));
}

// Somme brute de contributions par facette (avant sigmoïde). Exporté pour la
// calibration des constantes.
export function computeFacetRaw(aspects: Aspect[]): Record<Facet, number> {
  const raw: Record<Facet, number> = { harmony: 0, tension: 0, dynamic: 0, evolution: 0 };
  for (const asp of aspects) {
    const c = aspectContribution(asp);
    if (c === 0) continue;
    for (const f of FACETS) {
      if (involves(asp, FACET_BODIES[f])) raw[f] += c;
    }
  }
  return raw;
}

function sigmoid(raw: number, center: number, width: number): number {
  return 100 / (1 + Math.exp(-(raw - center) / width));
}

export interface ScoreBreakdown {
  score: number;                    // score global 0..100
  facets: Record<Facet, number>;    // sous-scores 0..100
  raw: Record<Facet, number>;       // sommes brutes (debug/calibration)
}

export function computeScoreBreakdown(aspects: Aspect[]): ScoreBreakdown {
  const raw = computeFacetRaw(aspects);
  const facets: Record<Facet, number> = { harmony: 0, tension: 0, dynamic: 0, evolution: 0 };
  let global = 0;

  for (const f of FACETS) {
    const { center, width } = FACET_CAL[f];
    const sub = sigmoid(raw[f], center, width);
    facets[f] = Math.round(sub);
    global += FACET_WEIGHT[f] * sub;
  }

  return { score: Math.round(global), facets, raw };
}

export function calculateCompatibilityScore(aspects: Aspect[]): number {
  return computeScoreBreakdown(aspects).score;
}
