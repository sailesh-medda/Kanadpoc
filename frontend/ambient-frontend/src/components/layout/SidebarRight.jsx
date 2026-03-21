// src/components/layout/SidebarRight.jsx
export default function SidebarRight() {
  return (
    <div className="sidebar__inner">
      <h3 className="sidebar__title">Assistive Tips</h3>
      <div className="tip">
        <strong>Pro:</strong> Speak naturally. The assistant detects speakers and
        structures SOAP notes automatically.
      </div>
      <div className="tip">
        <strong>Security:</strong> Audio is processed securely; PHI is never shown to
        unauthorized users.
      </div>
      <div className="tip">
        <strong>Shortcuts:</strong> Type “/icd” in the transcript to quickly suggest codes.
      </div>

      <div className="side-card">
        <h4>Stats (Today)</h4>
        <ul className="metrics">
          <li><span>Patients</span><strong>12</strong></li>
          <li><span>Avg. Visit</span><strong>18m</strong></li>
          <li><span>Draft Notes</span><strong>5</strong></li>
        </ul>
      </div>
    </div>
  );
}