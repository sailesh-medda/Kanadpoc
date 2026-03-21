// src/components/layout/SidebarLeft.jsx
export default function SidebarLeft() {
  return (
    <div className="sidebar__inner">
      <h3 className="sidebar__title">Quick Actions</h3>
      <ul className="side-list">
        <li><button className="chip">Create Prescription</button></li>
        <li><button className="chip">Order Lab Tests</button></li>
        <li><button className="chip">Schedule Follow‑up</button></li>
        <li><button className="chip">Discharge Summary</button></li>
      </ul>

      <div className="side-card">
        <h4>Today</h4>
        <p className="muted">
          09:30 — John S. (Follow‑up) <br />
          11:15 — Aisha K. (Diabetes consult) <br />
          14:00 — New patient (ENT)
        </p>
      </div>
    </div>
  );
}