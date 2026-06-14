# ☽ Compatibilité Astrale ✦

Application mobile de compatibilité astrologique basée sur la synastrie réelle.

## Stack

- **React + Vite**
- **Astrologer API** (RapidAPI) — calcul astronomique des thèmes natals et aspects de synastrie
- **Claude API** (Anthropic) — interprétation poétique personnalisée
- **Nominatim** (OpenStreetMap) — géocodage des villes, gratuit sans clé

## Comment ça marche

1. L'utilisateur saisit les données des deux personnes (prénom, ville, date, heure)
2. Nominatim convertit les villes en coordonnées GPS exactes
3. L'Astrologer API calcule les positions planétaires réelles et les aspects de synastrie
4. Un algorithme astrologique pondère les aspects (trigones, sextiles, carrés, oppositions...) selon les planètes impliquées pour calculer un score
5. Claude génère une interprétation poétique basée sur les données réelles

## Installation

```bash
npm install
```

## Configuration

Copie `.env.example` en `.env` et remplis tes clés :

```bash
cp .env.example .env
```

```
VITE_RAPIDAPI_KEY=ta_clé_rapidapi
VITE_ANTHROPIC_KEY=ta_clé_anthropic
```

### Obtenir les clés

**Astrologer API (RapidAPI)**
1. Va sur https://rapidapi.com/g-battaglia/api/astrologer
2. Crée un compte RapidAPI
3. Souscris au plan gratuit (100 req/mois)
4. Copie la clé `X-RapidAPI-Key`

**Anthropic API**
1. Va sur https://console.anthropic.com
2. Crée un compte et génère une clé API (`sk-ant-...`)

## Lancement

```bash
npm run dev
```

Ouvre http://localhost:3000

## Build pour production

```bash
npm run build
```

## Déploiement sur Vercel

```bash
npm install -g vercel
vercel
```

Ajoute les variables d'environnement dans le dashboard Vercel :
- `VITE_RAPIDAPI_KEY`
- `VITE_ANTHROPIC_KEY`

## Structure

```
src/
  App.jsx        — 4 écrans + logique complète
  App.css        — styles pixel-perfect (specs Figma)
  astrology.js   — moteur de calcul du score astrologique
  assets/
    bg1.png      — fond écran 1
    bg2.png      — fond écrans 2/3/4
```
