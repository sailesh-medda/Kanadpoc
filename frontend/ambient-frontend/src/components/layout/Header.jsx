// src/components/layout/Header.jsx
export default function Header() {
  return (
    <header className="header glassy">
      <div className="header__brand">
        <span className="logo-dot" aria-hidden="true" />
        <span className="brand-text">Care<span className="accent">Assist</span></span>
      </div>

      <nav className="header__nav">
        <a href="#new" className="nav-link">New Visit</a>
        <a href="#history" className="nav-link">History</a>
        <a href="#settings" className="nav-link">Settings</a>
      </nav>

      <div className="header__actions">
        <button className="btn btn--ghost">Help</button>
        <button className="btn btn--primary">Sign out</button>
      </div>
    </header>
  );
}
