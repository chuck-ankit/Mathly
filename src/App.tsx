import { Component, lazy, ReactNode, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/Home';
import { GraphWorkspace } from './pages/GraphWorkspace';
import { ExplorePage } from './pages/Explore';
import { ExperimentDetailPage } from './pages/ExperimentDetail';
import { DailyPage } from './pages/Daily';
import { PlaygroundPage } from './pages/Playground';

/* Code-split the 3D stack: the 3D engine + 60-solid catalog are the
   heaviest non-math code in the app and are only needed on two routes.
   Lazy-loading keeps them out of the initial bundle. */
const Graph3DPage = lazy(() => import('./pages/Graph3D').then((m) => ({ default: m.Graph3DPage })));
const SolidsPages = lazy(() => import('./pages/Solids').then((m) => ({ default: m.SolidsPage })));
const SolidDetailPage = lazy(() => import('./pages/Solids').then((m) => ({ default: m.SolidDetailPage })));
import { applyTheme, getInitialTheme, Theme, toggleTheme } from './lib/theme';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 'var(--s-8)', textAlign: 'center' }}>
          <h2>Something went wrong.</h2>
          <p style={{ color: 'var(--text-2)', marginTop: 'var(--s-3)' }}>
            Sorry about that — please reload the page. Your equations are saved on this device.
          </p>
          <button
            type="button"
            style={{
              marginTop: 'var(--s-4)',
              padding: '10px 22px',
              borderRadius: 'var(--r-sm)',
              border: 'none',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function RouteFallback(): ReactNode {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '40vh' }}>
      <span className="math-loader">
        <svg viewBox="0 0 52 20" aria-hidden="true">
          <path d="M2 10 Q 8 0, 13 10 T 25 10 T 37 10 T 50 10" />
        </svg>
        loading…
      </span>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleToggle = (): void => setTheme((t) => toggleTheme(t));

  return (
    <ErrorBoundary>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header theme={theme} onToggleTheme={handleToggle} />
      <main id="main">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/graph" element={<GraphWorkspace />} />
            <Route path="/present" element={<GraphWorkspace forcePresentation />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/explore/:id" element={<ExperimentDetailPage />} />
            <Route path="/daily" element={<DailyPage />} />
            <Route path="/playground" element={<PlaygroundPage />} />
            <Route path="/graph3d" element={<Graph3DPage />} />
            <Route path="/solids" element={<SolidsPages />} />
            <Route path="/solids/:id" element={<SolidDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </ErrorBoundary>
  );
}