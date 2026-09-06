import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Logo } from './Logo';
import { Theme } from '../../lib/theme';
import './layout.css';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="site-header">
      <div className="container site-header__in">
        <Link to="/" className="site-header__brand" onClick={() => setMenuOpen(false)}>
          <Logo />
          <span className="site-header__name">Mathly</span>
        </Link>
        <nav className="site-nav" aria-label="Main">
          <NavLink to="/graph" className={({ isActive }) => `site-nav__link ${isActive ? 'is-active' : ''}`}>
            Graph
          </NavLink>
          <NavLink to="/explore" className={({ isActive }) => `site-nav__link ${isActive ? 'is-active' : ''}`}>
            Explore
          </NavLink>
          <NavLink to="/daily" className={({ isActive }) => `site-nav__link ${isActive ? 'is-active' : ''}`}>
            Daily
          </NavLink>
          <NavLink to="/playground" className={({ isActive }) => `site-nav__link ${isActive ? 'is-active' : ''}`}>
            Playground
          </NavLink>
          <NavLink to="/graph3d" className={({ isActive }) => `site-nav__link ${isActive ? 'is-active' : ''}`}>
            3D
          </NavLink>
          <NavLink to="/solids" className={({ isActive }) => `site-nav__link ${isActive ? 'is-active' : ''}`}>
            Solids
          </NavLink>
        </nav>
        <div className="site-header__right">
          <button
            type="button"
            className="icon-btn tap-target"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4.5" />
                <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className="icon-btn tap-target"
            onClick={() => navigate('/graph')}
            aria-label="Open graphing workspace"
            title="Graph workspace (Ctrl+K)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M3 14l4-5 3 3 5-7 6 9" />
              <path d="M3 20h18" />
            </svg>
          </button>
          <button
            type="button"
            className={`icon-btn tap-target ${menuOpen ? 'is-active' : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav className="site-nav-mobile container" aria-label="Mobile">
          {[
            { to: '/graph', label: 'Graph' },
            { to: '/explore', label: 'Explore' },
            { to: '/daily', label: 'Equation of the Day' },
            { to: '/playground', label: 'Parameter Playground' },
            { to: '/graph3d', label: '3D Studio' },
            { to: '/solids', label: 'Solids Gallery' },
          ].map((l) => (
            <Link key={l.to} to={l.to} className="site-nav-mobile__link" onClick={() => setMenuOpen(false)}>
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}