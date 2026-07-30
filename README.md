# Le Trésor de Thalès – Odyssée géométrique en mer

Jeu web pédagogique en français (classe de 3ᵉ), jouable dans le navigateur  
(priorité tablette paysage, commandes tactiles).

## Contenu disponible

| Partie | Statut | Contenu |
|--------|--------|---------|
| **Prologue** (7 scènes) | Jouable | Port de Géometria → départ de *La Sécante des Vents* |
| **Partie 1** (8 scènes) | Jouable | Récif des Angles droits — **théorème de Pythagore** (direct) |
| Partie 2 | Non intégrée | Réciproque du théorème de Pythagore |

### Partie 1 — Le récif des Angles droits

1. `p1_0_arrivee` — Entrée du récif  
2. `p1_1_decouverte` — Trois carrés du cartographe (conjecture)  
3. `p1_2_cours` — Carnet d’Euclide (pause cahier, 3 pages)  
4. `p1_3_verification` — Trois questions sans révélation de solution  
5. `p1_4_hypotenuse` — Exemple guidé (AB=7, AC=3 → √58 ≈ 7,6)  
6. `p1_5_cote` — Exemple guidé (rectangle en C, √80 ≈ 8,9)  
7. `p1_6_entrainement` — Quatre balises (2 hypoténuses + 2 côtés)  
8. `p1_7_finale` — Traversée (25 et 15), **premier fragment**, teaser Silas  

**Aide progressive** (exercices `progressiveHelp`) :  
1re erreur neutre → indices Maki après 2/3/4 erreurs → correction Euclide après 5 erreurs ou dès la réussite.

## Prérequis

- [Node.js](https://nodejs.org/) **22+** (module SQLite intégré `node:sqlite`)
- npm

## Installation et lancement

```bash
npm install
npm start
```

Ouvrir **http://localhost:3000**

Sous PowerShell Windows, si la politique d’exécution bloque `npm` :

```powershell
npm.cmd install
npm.cmd start
```

### Variables d’environnement

| Variable | Défaut | Rôle |
|----------|--------|------|
| `PORT` | `3000` | Port d’écoute |
| `SQLITE_PATH` | `data/jeu.sqlite` | Fichier SQLite |
| `SQLITE_BUSY_TIMEOUT` | `5000` | Attente base occupée (ms) |

Front et API sont servis par le **même serveur Express**.  
KaTeX est servi **localement** (`client/vendor/katex`, copié au `postinstall`).

## Progression et sauvegarde

- Pseudo seul (3–24 caractères), normalisé, sans mot de passe  
- Session via `POST /api/session` → jeton opaque (pas de pseudo dans l’URL)  
- Sauvegarde après scènes / exercices ; file d’attente locale si hors ligne  
- Reprise : même pseudo → même progression (y compris état pédagogique des exercices)  
- Parties strictement linéaires (pas de menu de saut)

## Tests

```bash
npm test
```

Couverture : pseudos, réponses numériques, progression, file d’attente, API,  
intégrité des assets, prologue, parties 1–7, **politique d’aide progressive**.

## Publication GitHub Pages (build statique)

Le projet n’utilise **pas Vite** : c’est une SPA vanilla (Express en local).  
Pour GitHub Pages, un build statique copie le client + `shared/` et préfixe les chemins.

### Build

```bash
npm install
npm run build:pages
```

- **Base path** par défaut : `/tresor-de-thales`  
  (dépôt GitHub `tresor-de-thales` → `https://<user>.github.io/tresor-de-thales/`)
- Sortie : dossier **`dist/`** (`index.html`, `js/`, `css/`, `assets/`, `content/`, `vendor/`, `shared/`, `.nojekyll`, `404.html`)
- Mode **offline** : progression dans `localStorage` (pas d’API SQLite sur Pages)

Personnaliser le base path :

```bash
# Linux / macOS
BASE_PATH=/mon-depot npm run build:pages

# PowerShell
$env:BASE_PATH="/mon-depot"; npm run build:pages
```

Aperçu local du build :

```bash
npm run preview:pages
```

### Déploiement

1. Sur GitHub : **Settings → Pages → Source = GitHub Actions**
2. Le workflow `.github/workflows/deploy-pages.yml` build et publie `dist/` à chaque push sur `main` / `master`
3. Le nom du dépôt doit correspondre au base path (`tresor-de-thales`)  
   sinon réglez `BASE_PATH` dans le workflow

## Architecture

```
client/           Interface, moteur de scènes, contenu, assets
  content/        prologue + parties 1–7
  assets/         décors, objets alpha, portraits, schémas
server/           Express + SQLite (WAL) — développement / classe
shared/           pseudo, progression, réponses, saveQueue, exerciseHelp
scripts/          build-pages.mjs, outils de contenu
dist/             build statique GitHub Pages (généré)
tests/
```

## Données stockées

Pseudo (affichage + canonique), progression, scènes, réponses, tentatives,  
indices, état pédagogique des exercices.  
**Pas** de score affiché, e-mail, mot de passe ni traqueur.

- En local (`npm start`) : SQLite + file d’attente  
- Sur GitHub Pages : **localStorage** uniquement
