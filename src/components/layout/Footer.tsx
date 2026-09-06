import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import './layout.css';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__in">
        <div className="site-footer__brand">
          <Logo size={24} />
          <div>
            <div className="site-footer__name">Mathly</div>
            <div className="site-footer__tagline">
              Type an equation. Draw one. See mathematics come alive.
            </div>
          </div>
        </div>
        <nav className="site-footer__nav" aria-label="Footer">
          <Link to="/graph">Graph</Link>
          <Link to="/explore">Explore examples</Link>
          <Link to="/daily">Equation of the Day</Link>
          <Link to="/playground">Parameter playground</Link>
          <Link to="/graph3d">3D surfaces</Link>
          <Link to="/solids">Solids gallery</Link>
        </nav>
      </div>
      <div className="container site-footer__legal">
        Built for curiosity. Mathematics should feel alive — no login required.
      </div>
    </footer>
  );
}