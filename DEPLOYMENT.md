# Mathly — Deployment Guide

Mathly is a **static SPA**: `npm run build` produces a self-contained `dist/` folder — no server runtime, no database, no environment variables. Any static host works. The only requirement is **SPA fallback**: every route (`/graph`, `/explore/:id`, `/solids/:id`, …) must serve `index.html`, or deep links and page refreshes will 404.

---

## 1. Production Build

```bash
npm ci          # or: npm install
npm run build   # type-checks, then bundles → dist/
npm run preview # optional: smoke-test the build locally on http://localhost:4173
```

What comes out of `dist/`:

| Path | Purpose |
| --- | --- |
| `index.html` | App shell |
| `assets/index-*.js` | Initial bundle (2D app) |
| `assets/Graph3D-*.js`, `assets/Solids-*.js` | Lazy 3D chunks, fetched on first visit |
| `assets/*.css`, `assets/*.svg` | Styles and logo |
| `favicon.svg` | Copied from `public/` |

Asset filenames are content-hashed — safe to cache forever (see §6).

---

## 2. Netlify

**Option A — dashboard:** Build command `npm run build`, publish directory `dist`.

**Option B — file in repo.** Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

# SPA fallback: serve index.html for any route without a file extension
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 3. Vercel

Create `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Or import the repo at vercel.com — the Vite preset is auto-detected; just confirm the rewrite exists (the rewrite *is* required for `/solids/:id` to survive a refresh).

## 4. Cloudflare Pages

- Framework preset: **Vite** · Build command: `npm run build` · Output: `dist`
- Add a `_redirects` file to `public/` (it lands in `dist/` automatically):

```
/*  /index.html  200
```

## 5. GitHub Pages

Two gotchas: the app lives under a **base path** (`/<repo>/`), and Pages has no SPA fallback. Handle both:

**a) Base path.** Set it only for this build via an env-aware tweak in `vite.config.ts`, or permanently:

```ts
export default defineConfig({
  base: '/<repo-name>/',
  plugins: [react()],
  server: { port: 5173 },
  // ...test config unchanged
});
```

**b) SPA fallback.** Copy `dist/index.html` to `dist/404.html` after building — GitHub serves `404.html` for unknown paths, and since `index.html` references hashed assets, the app boots on any route. Add a script and wire it into the build:

```bash
npm pkg set scripts.build:gh="tsc -b && vite build && cp dist/index.html dist/404.html"
```

Then deploy the `dist/` folder with the official [actions/deploy-pages](https://github.com/actions/deploy-pages) workflow (build in CI, upload `dist/` as the artifact).

## 6. Nginx / any classic web server

```nginx
server {
  listen 443 ssl;
  server_name mathly.example.com;
  root /var/www/mathly/dist;
  index index.html;

  # SPA fallback
  location / {
    try_files $uri $uri/ /index.html;
  }

  # hashed assets never change — cache them hard
  location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  # never cache the shell (it references the hashed assets)
  location = /index.html {
    add_header Cache-Control "no-cache";
  }
}
```

Same idea on Apache: `FallbackResource /index.html` in `.htaccess`.

---

## 7. Release Checklist

1. `npm run typecheck && npm test` — types clean, 204/204 tests pass
2. `npm run build` — succeeds; note the lazy chunks (`Graph3D-*`, `Solids-*`) appear in the output
3. `npm run preview` — click through `/`, `/graph`, `/explore`, `/explore/:id`, `/daily`, `/playground`, `/graph3d`, `/solids`, `/solids/:id` — including a **hard refresh on a deep link** (verifies SPA fallback)
4. Deploy
5. Post-deploy: open one deep link directly (e.g. `/solids/torus`) — it must load, not 404
6. Confirm `assets/*.js` responses carry long-lived cache headers

## 8. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| 404 on refresh of `/solids/:id` | Host lacks SPA fallback | Add the redirect/rewrite rules above |
| Blank page, console shows 404 on `/assets/…` | Deployed under a sub-path without matching `base` | Set `base` in `vite.config.ts` (GitHub Pages recipe) |
| Blank page only after an update | Old `index.html` cached | `no-cache` on `index.html` (Nginx snippet) |
| 3D pages slow to first open | Expected: lazy chunk download | Optional: add `<link rel="modulepreload" href="/assets/Graph3D-*.js">` — the hashed name changes per build, so prefer a header/injection plugin over hardcoding |
| Styles look wrong only on one page | Global CSS leak (see AUDIT_REPORT.md, BUG-3) | Fixed in current code; keep page styles scoped |
| `npm run preview` ≠ production quirks | Preview is a good proxy, not identical | Verify on the real host with the release checklist |

---

**Notes**

- No environment variables exist; if you later add analytics keys, expose them via `import.meta.env` and prefix secrets with `VITE_` awareness — secrets never belong in a static bundle.
- The Google Fonts `<link>` in `index.html` is the only third-party request. For fully offline/air-gapped deployments, self-host the fonts (download the woff2 files, drop them in `public/fonts/`, and swap the `<link>` for local `@font-face` rules).
