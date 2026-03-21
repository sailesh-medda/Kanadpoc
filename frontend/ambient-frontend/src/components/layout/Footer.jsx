// src/components/layout/Footer.jsx
export default function Footer() {
  return (
    <footer className="footer glassy">
      <p>
        © {new Date().getFullYear()} CareAssist · Built for clinicians ·
        <a className="footer-link" href="#privacy"> Privacy</a> ·
        <a className="footer-link" href="#terms"> Terms</a>
      </p>
    </footer>
  );
}