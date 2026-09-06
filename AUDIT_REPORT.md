# Mathly — Full Application Audit Report

**Date:** September 6, 2026
**Scope:** Complete codebase review (155 source files), UI/UX inspection of every page, performance profiling of the rendering engines, and live verification in a running build.
**Result:** All reported bugs fixed, all identified performance issues fixed, verified with typecheck, test suite, production build, and live DOM measurement.

---

## 1. Executive Summary

The user reported three visible bugs — overlapping text on the 3D graph page, a broken search bar on the Solids page, and missing shape previews on the Solids page — plus a general complaint that the app was "very slow and laggy."

The audit found the reported bugs were symptoms of three root causes (a reversed CSS grid, a missing utility class, and a leaked CSS selector), and that the lag had a precise, quantifiable cause: **every mounted 3D canvas ran a 60 Hz render loop forever, even when static and off-screen** — on the Solids page that meant ~70 simultaneous render loops doing thousands of per-frame string allocations.

All issues were fixed at the root. Post-fix verification:

| Check | Result |
| --- | --- |
| TypeScript (`tsc -b --noEmit`) | ✅ Clean |
| Test suite (Vitest) | ✅ 204/204 passing |
| Production build (Vite) | ✅ Succeeds; 3D routes now code-split |
| Live `/graph3d` | ✅ Canvas 515px wide (was 340), zero overlay overlap |
| Live `/solids` | ✅ All 70 previews render (246×149 each), search bar styled |
| Live `/explore` | ✅ No hooks errors, console clean |

---

## 2. Reported Bugs — Root Causes and Fixes

### BUG-1 · 3D Studio: "N triangles" badge overlaps other text (High, UI)

**Reported:** On the 3D graph page, the triangle-count badge overlaps other text.

**Root causes (two, compounding):**
1. **Reversed grid columns.** `.g3d-layout` defined `grid-template-columns: minmax(300px, 400px) minmax(0, 1fr)` with the **stage first** — so the interactive canvas was squeezed into a ≤400px column while the wide controls panel took the remaining space. Every pixel the canvas lost made its overlays (badge, hint pill) collide.
2. **Hint pill collision.** The "Drag to rotate · Scroll to zoom" pill was centered with `white-space: nowrap`, so at narrow stage widths it ran underneath the bottom-right triangles badge.

**Fixes:**
- Swapped the columns: stage now gets `minmax(0, 1fr)` (all remaining space), controls capped at `minmax(280px, 360px)`.
- Fixed the same reversal in the 901–1120px breakpoint (`src/pages/graph3d.css`), which still carried the old layout and was silently re-squeezing the canvas on mid-size screens.
- Hint pill is now anchored bottom-left with a hard right margin (`margin-right: calc(var(--s-3) + 96px)`) so it can never slide under the badge.
- Added a **container query** on the stage: when the stage itself is ≤560px wide, the hint hides entirely — the collision case is the stage's own width, not the viewport, which media queries can't see.

**Verified live:** at a 930px viewport the stage measures 515px (was 338px), the canvas backbuffer sizes correctly, and the hint/badge bounding boxes no longer intersect (hint auto-hidden by the container query at this width).

---

### BUG-2 · Solids: broken search bar (High, UI)

**Reported:** The Solids search bar renders wrong.

**Root cause:** `Solids.tsx` used `className="sr-only"` on the search label — but **`.sr-only` doesn't exist anywhere in this codebase**. The project's accessible-hiding utility is `.visually-hidden` (defined in `src/styles/global.css`). Result: the label text "Search solids" rendered as visible stray text inside the pill, and the actual `<input>` had no styling class (Explore styles its input directly; Solids only styled the wrapper).

**Fix:**
- Label class changed to `visually-hidden` (correct utility, keeps the label accessible to screen readers).
- Input styled consistently with the Explore page's search field.

**Verified live:** search input renders 560px wide with proper placeholder ("Search solids — try 'saddle', 'pyramid', 'torus'…"), zero stray `.sr-only` elements in the DOM.

---

### BUG-3 · Solids: no previews of shapes (Critical, UI)

**Reported:** Shape thumbnails don't appear on the Solids page.

**Root cause (the smoking gun):** `graph3d.css` defined `.g3d-canvas { position: absolute; inset: 0; width: 100%; height: 100% }` — **unscoped**. In development this is harmless if you never visit `/graph3d`, but in any bundled build all CSS is global, so the rule leaked onto **every Solids thumbnail canvas**. Each thumbnail sits in a flex container sized by its content; an absolutely-positioned canvas contributes no height, so **every container collapsed to 0px** and `overflow: hidden` clipped the canvas to nothing. Invisible previews, no errors.

**Fix:**
- Fill-the-stage positioning is now scoped: `.g3d-stage .g3d-canvas` (only the real stage canvas), while plain `.g3d-canvas` keeps just `display: block`.
- Thumbnail boxes use `aspect-ratio` so they reserve layout space regardless of canvas state.

**Verified live:** all **70 cards** render canvases at 246×149 CSS px (308×186 backbuffer), zero collapsed thumbs.

---

## 3. Performance Audit — Root Causes and Fixes

The "slow and laggy" complaint traced to four compounding issues in the 3D rendering path, all confirmed in code and all fixed.

### PERF-1 · Perpetual 60 Hz render loop on every canvas (Critical)

**Root cause:** `Engine3D` drove rendering with `setTimeout(loop, 16)` that **never stopped**. Every mounted canvas — main stage and every Solids thumbnail — redrew at ~60 Hz forever, even for a static surface nobody was looking at.

**Fix:** Event-driven rendering. The engine now renders via `requestAnimationFrame` **only while an animation is active** (spin, view transition) or while `markDirty()` requests are pending; a static canvas costs zero frames. `Graph3DCanvas`'s prop-change effects feed the scheduler directly.

### PERF-2 · Every thumbnail auto-rotating forever (High)

**Root cause:** All ~70 Solids thumbnails had `autoRotate` on, so even with an efficient loop, all 70 cards animated **permanently**, including ones scrolled off-screen. Each card also ran a never-cleared 600 ms polling interval.

**Fix:** A spin-slot registry caps **concurrent spinners at 6**; an `IntersectionObserver` (watching both directions) pauses off-screen cards and resumes on-screen ones; the polling interval is self-clearing. Visible cards spin; everything else is idle.

### PERF-3 · Thousands of per-frame string allocations (High)

**Root cause:** Per triangle, per frame, the renderer called `parseHex` + `mixColor`, and `darken()` ran a **regex `match()`** — at 4,608 triangles that's tens of thousands of string allocations and regex executions per frame, hammering the GC.

**Fix:** Color lookup table (LUT). Palettes are pre-resolved into cached typed arrays of RGB values; shading is a table lookup instead of hex parsing + string math per triangle.

### PERF-4 · `GraphThumb` shimmer loop leak (Medium)

**Root cause:** The animated placeholder in `GraphThumb` started a `requestAnimationFrame` loop that was **never cancelled** on unmount — a leak that accumulated while browsing Explore.

**Fix:** rAF id is tracked and cancelled in the effect cleanup.

### PERF-5 · Route-level code splitting (Medium)

**Fix:** `/graph3d` and `/solids` now load via `React.lazy` + `Suspense`. Build output confirms `Graph3D` (**9.3 kB**) and `Solids` (**7.1 kB**) are separate lazy chunks, out of the initial bundle — the 2D graphing pages no longer download the entire 3D engine.

---

## 4. Additional Issues Found and Fixed

| ID | Severity | Finding | Fix |
| --- | --- | --- | --- |
| QA-1 | High (crash risk) | `Explore.tsx` `ExampleCard` called `useMemo` **after an early return** — a Rules-of-Hooks violation that can crash when card counts change between renders | Hook order corrected |
| QA-2 | Low | Stale `tsconfig.tsbuildinfo` from an interrupted session produced phantom type errors citing line numbers that didn't exist | Build cache cleared; verified clean |
| QA-3 | Low | `graph3d.css` accumulated a duplicate `@container` rule across interrupted sessions (one fully hid the hint, one trimmed segments — the trim was dead code) | Deduplicated; kept the safer full-hide behavior |

---

## 5. Verification

**Static:**
- `tsc -b --noEmit` — clean (after clearing the stale incremental cache).
- `vitest run` — **204/204 tests pass**.

**Build:**
- `npm run build` — succeeds; `Graph3D` and `Solids` confirmed as separate lazy chunks in the output manifest.

**Live (dev server + DOM measurement):**
- `/graph3d` — stage 515px @ 930px viewport, canvas backbuffer sized, badge/hint bounding boxes non-intersecting, console free of errors.
- `/solids` — 70/70 preview canvases at 246×149, search bar 560px wide, no stray label text, no `.sr-only` residue.
- `/explore` — all cards render, no hooks errors, console clean.

*(Note: console shows only React Router v6 "future flag" notices — informational, not errors. See recommendations.)*

---

## 6. Remaining Recommendations (not fixed — intentional follow-ups)

1. **React Router v7 future flags** — opt into `v7_startTransition` and `v7_relativeSplatPath` to silence the console warnings and prepare for v7.
2. **OffscreenCanvas / Web Worker rendering** — the 3D engine's per-triangle work could move off the main thread for buttery interaction at High detail.
3. **Virtualized grids for Solids** — 70 canvases render fine now, but if the catalog grows past a few hundred, a virtualizer (render only visible cards) keeps memory flat.
4. **Visual regression tests** — the `.g3d-canvas` leak class of bug (global CSS side effects) is exactly what per-page Playwright screenshot tests catch before users do.
5. **Sub-resource hints** — `<link rel="modulepreload">` for the 3D chunks from the header's "3D"/"Solids" links would eliminate the lazy-route flash on slow connections.

---

## 7. Files Changed

| File | Change |
| --- | --- |
| `src/lib/graph3d/engine3d.ts` | Event-driven rAF scheduling, color LUT, cached theme tokens |
| `src/pages/graph3d.css` | Grid columns fixed (+ breakpoint), hint anchoring, container queries, scoped `.g3d-canvas` |
| `src/pages/solid.css` | `aspect-ratio` thumb boxes, responsive detail stage |
| `src/pages/Solids.tsx` | Search bar fix, IntersectionObserver visibility, spin-slot registry, self-clearing poll |
| `src/pages/Explore.tsx` | Rules-of-Hooks fix |
| `src/components/graph/GraphThumb.tsx` | Shimmer rAF cleanup |
| `src/App.tsx` | Lazy routes + Suspense |
| `src/pages/pages.css` | `.home-3d-thumb` restored (deduplicated) |
