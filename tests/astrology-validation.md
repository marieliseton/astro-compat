# Audit des calculs astrologiques — Astroooooo

> Date d'audit : 2026-06-16  
> Méthodologie : analyse statique du code + tests instrumentés comparant les deux implémentations

---

## Résumé exécutif

| # | Problème | Gravité | Impact |
|---|---|---|---|
| 1 | `gmst()` utilise `time.tt` au lieu de `time.ut` | 🔴 CRITIQUE | Ascendant décalé de 0.17–0.31° |
| 2 | Système de maisons Equal House (≠ Placidus d'Astro.com) | 🟠 ÉLEVÉ | Numéros de maisons faux pour l'utilisateur |
| 3 | Positions planétaires | ✅ CORRECT | Erreur < 0.001° (astronomy-engine = JPL-grade) |
| 4 | Conversion timezone / DST | ✅ CORRECT | Sonde Intl correcte pour tous les fuseaux |
| 5 | Référentiel écliptique | ✅ CORRECT | `Ecliptic()` utilise l'écliptique de date (pas J2000) |
| 6 | Score de compatibilité | 🟡 MINEUR | Formule arbitraire, non-standard |

---

## 1. Bug confirmé : GMST utilise TT au lieu de UT

### Code bugué (calculate-chart.ts)

```typescript
function gmst(time: AstroTime): number {
  const T = time.tt / 36525;
  const theta = 280.46061837
    + 360.98564736629 * time.tt   // ← BUG : devrait être time.ut
    + 0.000387933 * T * T
    - (T * T * T) / 38710000;
  return (((theta % 360) + 360) % 360) / 15;
}
```

### Explication

La formule du GMST (Greenwich Mean Sidereal Time) est basée sur la **rotation terrestre**, qui est mesurée en **Temps Universel (UT1)**, pas en Temps Terrestre (TT). `time.tt` et `time.ut` diffèrent de ΔT (différence accumulée due au ralentissement de la rotation de la Terre).

### Mesure de l'erreur (tests instrumentés)

| Date | ΔT mesuré | Erreur GMST | Impact Ascendant |
|---|---|---|---|
| 1970-01-01 | 40.2 s | **0.168°** | ~10 arcmin |
| 1980-01-01 | 50.5 s | **0.211°** | ~13 arcmin |
| 1990-01-01 | 56.9 s | **0.238°** | ~14 arcmin |
| 1997-04-16 | 62.5 s | **0.261°** | ~16 arcmin |
| 2000-01-01 | 63.9 s | **0.267°** | ~16 arcmin |
| 2010-01-01 | 66.7 s | **0.279°** | ~17 arcmin |
| 2024-01-01 | 73.9 s | **0.309°** | ~19 arcmin |

### Conséquences

- L'Ascendant est décalé de **+0.17° à +0.31°** selon l'année de naissance
- Toutes les **maisons Equal House** héritent de cette erreur (elles dérivent de l'Ascendant)
- Les **signes** des planètes ne sont **pas affectés** (le GMST n'influe que sur l'Ascendant)
- Si l'Ascendant est **à moins de 0.31° d'une cuspide de signe**, le signe de l'Ascendant peut être faux

### Correction

Remplacer la fonction manuelle par `SiderealTime(time)` (déjà exportée par astronomy-engine) :

```typescript
// AVANT
const gstHours = gmst(time);

// APRÈS
const gstHours = SiderealTime(time); // GAST (Greenwich Apparent Sidereal Time), nutation incluse
```

Mesure après correction : `GMST_ut - GAST = 0.0004°` (erreur résiduelle infime = nutation équatoriale).

---

## 2. Système de maisons : Equal House ≠ Placidus

### Ce qu'on fait

```typescript
function houseCusps(ascLon: number): number[] {
  return Array.from({ length: 12 }, (_, i) => ((ascLon + i * 30) % 360 + 360) % 360);
}
```

**Equal House** : 12 maisons de 30° exactement, à partir du degré de l'Ascendant.

### Ce qu'Astro.com fait

**Placidus** (défaut sur Astro.com, Astrostyle, Astroseek) : divise en trois l'arc de temps que le soleil met à passer d'un horizon à l'autre. Produit des maisons d'inégale taille.

### Comparaison des systèmes

| Système | Maison 1 | Autres maisons | Commentaire |
|---|---|---|---|
| **Whole Sign** | Tout le signe de l'Ascendant | Signes entiers suivants | Le plus simple |
| **Equal House** | 30° depuis l'ASC | 30° réguliers | Notre implémentation actuelle |
| **Placidus** | ASC → DESC | Arcs de temps trisectés | Standard Astro.com, Astroseek |

### Impact concret (Paris, 48.86°N)

Pour une naissance à Paris le 16 avril 1997 à 12h00 :
- Notre Ascendant : **Capricorne 22°** (correct)
- Nos maisons Equal House : Maison 1 démarre à 292°, Maison 2 à 322°, Maison 3 à 352°…
- Astro.com (Placidus) : maisons asymétriques, souvent décalées de 1 à 3 maisons pour les planètes

### C'est la **principale cause** de la divergence perçue par les utilisateurs

Un Soleil en Bélier dans la maison 5 (Equal House) pourrait être en maison 3 ou 4 avec Placidus — sur le même thème, pour les mêmes données.

### Correction possible

Implémenter le **système Placidus** ou **Whole Sign**. Placidus est le standard mais il est mathématiquement complexe et échoue au-delà de ±60° de latitude. Whole Sign est simple, croissant en popularité, et correspond mieux à une lecture grand public.

---

## 3. Positions planétaires : CORRECT

### Méthodologie de vérification

Test sur le solstice d'hiver 2023 (le Soleil doit être exactement à 270°) :

```
Solstice hiver 2023 : 2023-12-22T03:27:34.200Z
Soleil mesuré       : 270.000096 °
Erreur              : 0.000096 ° (= 0.35 arcseconde)
```

**Conclusion** : astronomy-engine est précis à < 0.001° pour toutes les planètes (standard JPL Horizons). Les signes planétaires calculés sont corrects.

### Vérification du référentiel écliptique

Contra-indication préliminaire vérifiée : j'avais soupçonné que `Ecliptic(vector)` utiliserait l'écliptique J2000 au lieu de l'écliptique de date (précession manquante). Tests instrumentés pour 1950, 1970, 2000, 2024 :

```
date   | Ecliptic() | Rotation_EQJ_ECT | diff
1950   | 280.5142   | 280.5142         | 0.0000
1970   | 280.6659   | 280.6659         | 0.0000
2000   | 280.3687   | 280.3687         | 0.0000
2024   | 280.5485   | 280.5485         | 0.0000
```

`Ecliptic()` extrait le temps stocké dans le `Vector` retourné par `GeoVector()` et applique automatiquement la correction de précession. **Pas de bug ici.**

---

## 4. Conversion timezone / DST : CORRECT

La technique de sonde (probe UTC → formatage en timezone locale → mesure de l'offset) est mathématiquement correcte :

```
Hiver 1990 (UTC+1 attendu) : offset = +1h ✓
Été   1990 (UTC+2 attendu) : offset = +2h ✓  (DST correctement détecté)
16 avr 1997 (UTC+2 attendu): offset = +2h ✓
```

---

## 5. Calcul de l'Ascendant : PARTIELLEMENT CORRECT

La **formule mathématique** est correcte :
```
ASC = atan2(-cos(RAMC), sin(RAMC)·cos(ε) + tan(φ)·sin(ε))
```

Le **seul défaut** est l'alimentation en GMST bugué (bug #1). Avec `SiderealTime()`, le résultat est correct.

Résultat mesuré pour Paris, 16 avril 1997, 12h00 :
| Version | Ascendant |
|---|---|
| Bug (GMST-TT) | Capricorne 22°20' |
| Corrigé (SiderealTime) | **Capricorne 22°08'** |
| Astro.com (à vérifier) | Capricorne ~22° (attendu similaire) |

---

## 6. Calcul des aspects : CORRECT

```typescript
const ASPECT_DEFS = {
  conjunction: { angle: 0,   orb: 8 },
  sextile:     { angle: 60,  orb: 6 },
  square:      { angle: 90,  orb: 7 },
  trine:       { angle: 120, orb: 7 },
  opposition:  { angle: 180, orb: 8 },
};
```

- Orbs standard (légèrement larges mais dans la norme)
- `angleDiff` correct (minimum des deux arcs)
- Détection : pas de faux positifs identifiés
- Synastrie : 8 planètes personnelles/sociales (correct, sans Uranus/Neptune/Pluton)

---

## 7. Score de compatibilité : ARBITRAIRE MAIS COHÉRENT

### Formule actuelle

```
score = clamp(50 + raw × 2.5, 20, 97)
où raw = Σ(delta × poids_planètes × orbMult) / Σ(poids_planètes)
```

### Pourquoi 64% vs 82% ?

- **+18 pts** : conjonction Lune-Soleil (la plus valorisée)
- **+12 pts** : trigone
- **-10 pts** : opposition
- Chaque aspect est pondéré par les planètes impliquées (Soleil/Lune = poids 5, Vénus/Mars = 4…)
- Plus l'orbe est serré, plus le poids est fort (`orbMult = exact/100`)

**Exemple** : si deux personnes ont 3 trigones Soleil-Lune parfaits, raw ≈ +12, score ≈ 50 + 12×2.5 = 80%.

Ce n'est pas un standard astrologique reconnu — c'est une heuristique maison. C'est **explicable** mais pas **vérifiable** contre une source externe (il n'existe pas de "vrai" score de compatibilité en astrologie).

---

## Cas de validation (16 avril 1997, 12h00, Paris)

| Planète | Notre code | Astro.com (à vérifier) | Δ |
|---|---|---|---|
| ☉ Soleil | Bélier 26°27' | ≈ Bélier 26° | à confirmer |
| ☽ Lune | Lion 15°14' | à vérifier | à confirmer |
| ☿ Mercure | Taureau 9°33' | à vérifier | à confirmer |
| ♀ Vénus | Taureau 0°01' | à vérifier | **⚠ bord de signe** |
| ♂ Mars | Vierge 17°34' | à vérifier | à confirmer |
| ♃ Jupiter | Verseau 17°33' | à vérifier | à confirmer |
| ♄ Saturne | Bélier 12°18' | à vérifier | à confirmer |
| ↑ Ascendant | Capricorne 22°08' (fixé) | à vérifier | à confirmer |

> ⚠ **Vénus à 30.015°** : elle est à 0.015° du bord Bélier/Taureau. Si les positions sont décalées de plus de 0.015°, le signe serait faux. C'est un cas limite à surveiller.

---

## Actions recommandées (par ordre de priorité)

### Action 1 — IMMÉDIATE : Corriger le GMST (fix 5 lignes)

```typescript
// calculate-chart.ts
import { Body, MakeTime, GeoVector, Ecliptic, SiderealTime, type AstroTime } from 'astronomy-engine';

// Supprimer gmst() et obliquity() — remplacer par :
function calculateAscendant(time: AstroTime, lat: number, lon: number): number {
  const gstHours = SiderealTime(time);  // ← remplace gmst(time)
  // ...reste identique
}
```

### Action 2 — IMPORTANTE : Implémenter Whole Sign ou Placidus

**Recommandation** : **Whole Sign** (le plus simple, aucun bug aux hautes latitudes, populaire) :
- Maison 1 = tout le signe de l'Ascendant
- Maison 2 = signe suivant, etc.
- Les numéros de maison correspondent alors aux vrais signes

**Alternative** : Placidus (15 à 20 lignes de code supplémentaires) — requis pour correspondre exactement à Astro.com.

### Action 3 — OPTIONNELLE : Comparaison manuelle sur Astro.com

Pour valider définitivement, entrer les mêmes données dans Astro.com et comparer signe par signe.

---

*Audit établi par analyse statique + tests Node.js instrumentés. Aucun code n'a été modifié.*
