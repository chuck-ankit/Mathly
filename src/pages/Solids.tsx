import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SOLIDS, SOLID_GROUPS, GROUP_BLURBS, SolidEntry, SolidGroup } from '../data/solids';
import { Graph3DCanvas } from '../components/graph3d/Graph3DCanvas';
import { PrettyMath } from '../components/math/PrettyMath';
import { normalizeMesh } from '../lib/graph3d/mesh';
import './pages.css';
import './solid.css';

/** Searchable, filterable gallery of 3D solids. */
export function SolidsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<SolidGroup | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SOLIDS.filter((s) => {
      if (group && s.group !== group) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.blurb.toLowerCase().includes(q) ||
        s.notice.toLowerCase().includes(q)
      );
    });
  }, [query, group]);

  const groupCounts = useMemo(() => {
    const out: Record<string, number> = {};
    const q = query.trim().toLowerCase();
    for (const g of SOLID_GROUPS) {
      out[g] = SOLIDS.filter((s) => s.group === g && (!q || s.name.toLowerCase().includes(q) || s.blurb.toLowerCase().includes(q) || s.notice.toLowerCase().includes(q))).length;
    }
    return out;
  }, [query]);

  const allCount = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SOLIDS.filter((s) => !q || s.name.toLowerCase().includes(q) || s.blurb.toLowerCase().includes(q) || s.notice.toLowerCase().includes(q)).length;
  }, [query]);

  const surprise = () => {
    if (filtered.length > 0) navigate(`/solids/${filtered[Math.floor(Math.random() * filtered.length)].id}`);
  };

  return (
    <div className="page container page-enter">
      <header className="page-head">
        <p className="eyebrow">3D Gallery</p>
        <h1>Solids &amp; surfaces, to hold in your mind</h1>
        <p className="page-head__sub">
          {SOLIDS.length} shapes from Euclid to topology — every one rotatable. Pick one and read its formulas.
        </p>
      </header>

      <div className="explore-controls">
        <label className="visually-hidden" htmlFor="solids-search">Search solids</label>
        <input
          id="solids-search"
          className="explore-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search solids — try “saddle”, “pyramid”, “torus”…"
        />
        <div className="explore-filters" role="group" aria-label="Group filter">
          <button type="button" className={`explore-chip ${group === null ? 'is-active' : ''}`} onClick={() => setGroup(null)}>
            All<span className="explore-chip__count">{allCount}</span>
          </button>
          {SOLID_GROUPS.map((g) => (
            <button
              key={g}
              type="button"
              className={`explore-chip ${group === g ? 'is-active' : ''}`}
              onClick={() => setGroup(group === g ? null : g)}
            >
              {g}
              <span className="explore-chip__count">{groupCounts[g]}</span>
            </button>
          ))}
        </div>
      </div>

      {group && <p className="muted solid-group-blurb">{GROUP_BLURBS[group]}</p>}

      {filtered.length > 0 && (
        <div className="explore-results__bar">
          <p className="explore-count" aria-live="polite">
            {filtered.length} solid{filtered.length === 1 ? '' : 's'}
          </p>
          <button type="button" className="explore-surprise" onClick={surprise}>
            🎲 Surprise me
          </button>
        </div>
      )}

      <div className="solid-grid">
        {filtered.map((s) => (
          <SolidCard key={s.id} solid={s} />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="muted solid-empty">No solids match “{query}” — try a different word.</p>
      )}
    </div>
  );
}

function SolidCard({ solid }: { solid: SolidEntry }) {
  return (
    <Link to={`/solids/${solid.id}`} className="solid-card">
      <SolidThumb solid={solid} />
      <h3>{solid.name}</h3>
      <p className="muted">{solid.blurb}</p>
      <div className="solid-card__formulas">
        {solid.volume && (
          <span className="badge solid-card__formula">
            <PrettyMath tex={solid.volume} />
          </span>
        )}
        {solid.equation && (
          <span className="badge solid-card__formula">
            <PrettyMath tex={solid.equation} />
          </span>
        )}
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------
   Spin-slot registry: at most MAX_SPINNING thumbnails auto-rotate at
   once. Each rotating card repaints at 60fps, so an uncapped gallery
   means ~50 concurrent render loops — the single biggest cause of jank
   on this page. Waiters queue FIFO: the longest-queued visible card
   takes the next freed slot.
   ------------------------------------------------------------ */
const MAX_SPINNING = 6;
const activeSpins = new Set<symbol>();
const spinQueue: symbol[] = [];
const spinWake = new Map<symbol, () => void>();

function acquireSpinSlot(key: symbol, wake: () => void): boolean {
  if (activeSpins.has(key)) return true;
  spinWake.set(key, wake);
  if (activeSpins.size < MAX_SPINNING) {
    activeSpins.add(key);
    return true;
  }
  if (!spinQueue.includes(key)) spinQueue.push(key);
  return false;
}

function releaseSpinSlot(key: symbol): void {
  spinWake.delete(key);
  if (!activeSpins.delete(key)) {
    // Was only waiting — drop it from the queue.
    const i = spinQueue.indexOf(key);
    if (i >= 0) spinQueue.splice(i, 1);
    return;
  }
  // Promote the longest-waiting card into the freed slot.
  while (spinQueue.length > 0) {
    const next = spinQueue.shift()!;
    const cb = spinWake.get(next);
    spinWake.delete(next);
    if (cb) {
      activeSpins.add(next);
      cb();
      return;
    }
  }
}

/** Lazily-mounted rotating thumbnail. Canvases mount/unmount with the
 *  viewport (IntersectionObserver, both directions), and only the
 *  MAX_SPINNING most-recently-visible cards keep auto-rotating — the
 *  rest render a static frame that costs nothing when idle. */
function SolidThumb({ solid }: { solid: SolidEntry }) {
  const [visible, setVisible] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const spinKeyRef = useRef<symbol | null>(null);
  if (spinKeyRef.current === null) spinKeyRef.current = Symbol('solid-spin');
  const spinKey = spinKeyRef.current;

  const isInView = useCallback((node: Element): boolean => {
    const r = node.getBoundingClientRect();
    return r.top < window.innerHeight + 200 && r.bottom > -200;
  }, []);

  // Mount/unmount by viewport position. IO fires both ways so cards far
  // above or below the fold release their canvas entirely.
  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    setVisible(isInView(node));
    if (typeof IntersectionObserver === 'function') {
      const obs = new IntersectionObserver(
        (entries) => setVisible(entries.some((e) => e.isIntersecting)),
        { rootMargin: '200px' }
      );
      obs.observe(node);
      return () => obs.disconnect();
    }
    // Fallback for environments where IO never fires: scroll/resize
    // listeners plus a BOUNDED settle-poll (stops itself after ~3s) —
    // the old code polled every 600ms per card, forever.
    const check = () => setVisible(isInView(node));
    let ticks = 0;
    const iv = window.setInterval(() => {
      check();
      ticks += 1;
      if (ticks >= 8) window.clearInterval(iv);
    }, 400);
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [isInView]);

  // Claim one of the spin slots while visible; wait in the FIFO otherwise.
  useEffect(() => {
    if (!visible) return;
    const got = acquireSpinSlot(spinKey, () => setSpinning(true));
    if (got) setSpinning(true);
    return () => releaseSpinSlot(spinKey);
  }, [visible, spinKey]);

  const mesh = useMemo(() => (visible ? normalizeMesh(solid.build(), 3.2) : null), [solid, visible]);
  return (
    <div ref={nodeRef} className="solid-card__thumb">
      {mesh ? (
        <Graph3DCanvas
          mesh={mesh}
          zLo={-1.5}
          zHi={1.5}
          style={{ wireframe: false }}
          autoRotate={spinning}
          autoRotateSpeed={0.0035}
        />
      ) : (
        <div className="solid-card__thumb-placeholder" aria-hidden="true" />
      )}
    </div>
  );
}

/** Detail page for one solid. */
export function SolidDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const solid = SOLIDS.find((s) => s.id === id);

  useEffect(() => {
    if (!solid) return;
    document.title = `${solid.name} — Mathly`;
    return () => {
      document.title = 'Mathly — Explore Mathematics, Visually';
    };
  }, [solid]);

  if (!solid) {
    return (
      <div className="page container page-enter">
        <p className="muted">I don't know that solid.</p>
        <Link to="/solids" className="link">
          ← Back to the gallery
        </Link>
      </div>
    );
  }

  const related = SOLIDS.filter((s) => s.group === solid.group && s.id !== solid.id).slice(0, 4);
  const idx = SOLIDS.findIndex((s) => s.id === solid.id);

  return (
    <div className="page container page-enter">
      <button type="button" className="link" onClick={() => navigate('/solids')}>
        ← All solids
      </button>

      <div className="solid-detail">
        <section className="solid-detail__stage" aria-label={`3D model of ${solid.name}`}>
          <DetailCanvas solid={solid} />
          <p className="solid-detail__hint">Spins on its own — drag to take over · scroll to zoom · double-click to reset</p>
        </section>

        <section className="solid-detail__info">
          <p className="eyebrow">{solid.group}</p>
          <h1>{solid.name}</h1>
          <p className="page-head__sub">{solid.blurb}</p>

          <div className="solid-detail__formulas">
            {solid.volume && (
              <div className="solid-formula">
                <span className="solid-formula__label">Volume</span>
                <PrettyMath tex={solid.volume} display />
              </div>
            )}
            {solid.area && (
              <div className="solid-formula">
                <span className="solid-formula__label">Surface area</span>
                <PrettyMath tex={solid.area} display />
              </div>
            )}
            {solid.equation && (
              <div className="solid-formula">
                <span className="solid-formula__label">Equation</span>
                <PrettyMath tex={solid.equation} display />
              </div>
            )}
          </div>

          <div className="solid-detail__notice">
            <h2>What to notice</h2>
            <p>{solid.notice}</p>
          </div>

          <div className="solid-detail__nav">
            {idx > 0 && (
              <Link className="link" to={`/solids/${SOLIDS[idx - 1].id}`}>
                ← {SOLIDS[idx - 1].name}
              </Link>
            )}
            {idx < SOLIDS.length - 1 && (
              <Link className="link" to={`/solids/${SOLIDS[idx + 1].id}`}>
                {SOLIDS[idx + 1].name} →
              </Link>
            )}
          </div>
        </section>
      </div>

      {related.length > 0 && (
        <section className="solid-related">
          <h2>More in {solid.group}</h2>
          <div className="solid-grid solid-grid--compact">
            {related.map((s) => (
              <SolidCard key={s.id} solid={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** Full-size orbitable canvas; auto-spins until first interaction. */
function DetailCanvas({ solid }: { solid: SolidEntry }) {
  const mesh = useMemo(() => normalizeMesh(solid.build(), 3.2), [solid]);
  return (
    <Graph3DCanvas
      mesh={mesh}
      zLo={-2}
      zHi={2}
      autoRotate
      style={{ wireframe: solid.group !== 'Polyhedra' }}
    />
  );
}
