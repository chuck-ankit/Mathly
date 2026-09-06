# Mathly — Explore Mathematics, Visually

An interactive mathematics playground: type an equation, draw one, or explore 3D surfaces — no login, no backend, everything runs in your browser.

![Tech](https://img.shields.io/badge/React-18-blue) ![Tech](https://img.shields.io/badge/TypeScript-5.6-blue) ![Tech](https://img.shields.io/badge/Vite-5-purple)

---

## Features

| Page | Route | What it does |
| --- | --- | --- |
| **Graph** | `/graph` | Full 2D graphing workspace — multiple equations, pan/zoom, analysis tab, presentation mode |
| **Present** | `/present` | Distraction-free presentation view of the workspace |
| **Explore** | `/explore` | Curated gallery of experiments (distributions, spirals, Lissajous…), each with a live detail page |
| **Daily** | `/daily` | A deterministic Equation of the Day with interactive parameters |
| **Playground** | `/playground` | Parameter playground — drag sliders and watch the graph respond |
| **3D Studio** | `/graph3d` | Type any `z = f(x, y)` — saddles, ripples, cones — with orbit, zoom, palettes, and share links |
| **Solids** | `/solids` | Gallery of 70 interactive 3D solids (Platonic solids, prisms, pyramids, quadrics, surfaces of revolution…) with detail views |

Extras baked in: **handwritten equation input** (draw with mouse/finger), a **math keyboard**, **KaTeX-rendered pretty math**, **shareable URLs** (equations encoded in the link), and **dark/light themes**.

## Tech Stack

- **React 18** + **TypeScript 5.6** — UI, strictly typed
- **Vite 5** — dev server and production bundling (3D routes are lazy-loaded code splits)
- **React Router 6** — SPA routing
- **KaTeX** — math typesetting
- **Vitest** — unit tests (204 tests across 11 suites)
- **Zero backend** — no API keys, no environment variables, no database. State persists in `localStorage`; sharing works by encoding equations into the URL.

## Quick Start

```bash
# 1. Install (any Node.js ≥ 18)
npm install

# 2. Start the dev server → http://localhost:5173
npm run dev

# 3. Verify everything passes
npm run typecheck   # TypeScript, strict
npm test            # 204 unit tests
npm run build       # production build to dist/
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 with HMR |
| `npm run build` | Type-checks, then bundles to `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run typecheck` | `tsc -b --noEmit` — types only, no emit |
| `npm test` | Runs the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |

## Project Structure

```
├── index.html                  # SPA shell (fonts, meta, root div)
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx                # Entry — router + app mount
    ├── App.tsx                 # Routes, ErrorBoundary, lazy 3D routes, theme
    ├── pages/                  # One module per route (+ per-page CSS)
    │   ├── Home.tsx  GraphWorkspace.tsx  Explore.tsx  ExperimentDetail.tsx
    │   ├── Daily.tsx  Playground.tsx    Graph3D.tsx    Solids.tsx
    │   └── graph3d.css  solid.css  pages.css
    ├── components/
    │   ├── graph/              # 2D canvas + thumbnails
    │   ├── graph3d/            # 3D canvas component
    │   ├── handwriting/        # Draw-an-equation canvas
    │   ├── math/               # Equation editor, math keyboard, KaTeX rendering
    │   ├── workspace/          # Equation list, analysis panel
    │   ├── layout/             # Header, Footer
    │   └── ui/                 # Small shared primitives
    ├── lib/
    │   ├── math/               # THE CORE: tokenizer → parser → evaluator,
    │   │                       #   polynomial algebra, root finding, sampling,
    │   │                       #   simplification, LaTeX export
    │   ├── graph/              # 2D render engine (event-driven rAF loop)
    │   ├── graph3d/            # 3D engine: surface tessellation → mesh → render
    │   ├── handwriting/        # Stroke recognition
    │   ├── storage.ts          # localStorage persistence
    │   ├── theme.ts            # Dark/light theming
    │   └── url.ts              # ↔ shareable URL encoding
    ├── state/
    │   └── useWorkspace.ts     # Workspace state (equations, view, tools)
    └── styles/
        ├── tokens.css          # Design tokens (colors, spacing, radii)
        └── global.css          # Reset, utilities (incl. .visually-hidden)
```

## Architecture Notes

**Math pipeline.** Input text flows through a hand-written tokenizer → Pratt parser → AST evaluator. The same AST powers plotting (sampling), analysis (roots, extrema), pretty-printing (KaTeX/LaTeX), and simplification. Nothing is string-evaluated — user input is parsed, never `eval`ed.

**Rendering.** Both engines (2D and 3D) are dependency-free canvas renderers with **event-driven `requestAnimationFrame` loops**: they redraw when something changes (interaction, animation) and cost zero frames when idle. Colors are pre-resolved lookup tables — no per-frame string allocation. 3D solids tessellate to indexed triangle meshes; the solids catalog is data (`src/data/solids.ts`) rendered by the same engine.

**Performance.** `/graph3d` and `/solids` are lazy chunks (~9 kB and ~7 kB) so the 2D app loads without the 3D engine. Solids thumbnails pause spinning when scrolled off-screen (IntersectionObserver) and cap concurrent animations. Details and verification data: see [AUDIT_REPORT.md](./AUDIT_REPORT.md).

**Accessibility.** Skip link, semantic landmarks, `aria` labels on all controls, screen-reader-only labels via `.visually-hidden`, keyboard-operable equation lists, and an error boundary that preserves saved equations.

## Deployment

The app builds to a fully static bundle in `dist/` — any static host works, with one requirement: **SPA fallback** (all routes must serve `index.html`). Step-by-step recipes for Netlify, Vercel, Cloudflare Pages, GitHub Pages, and Nginx: see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) — hosting and release guide
- [AUDIT_REPORT.md](./AUDIT_REPORT.md) — full UI/UX + performance audit with fixes
- [Mathly_implemntaio_plan.md](./Mathly_implemntaio_plan.md) — original implementation plan

---

Built for curiosity. Mathematics should feel alive — no login required.
