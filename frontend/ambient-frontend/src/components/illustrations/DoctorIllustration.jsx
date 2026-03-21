// src/components/illustrations/DoctorIllustration.jsx
export default function DoctorIllustration() {
  return (
    <svg
      className="doctor-svg floaty"
      viewBox="0 0 260 220"
      role="img"
      aria-label="Doctor illustration"
    >
      <defs>
        <linearGradient id="coat" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8f0ff" />
          <stop offset="100%" stopColor="#dbeafe" />
        </linearGradient>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ecfeff" />
          <stop offset="100%" stopColor="#eef2ff" />
        </linearGradient>
      </defs>

      {/* Background bubble */}
      <ellipse cx="130" cy="110" rx="120" ry="90" fill="url(#bg)" opacity="0.7" />

      {/* Head */}
      <circle cx="130" cy="70" r="28" fill="#fde7d9" />
      <circle cx="121" cy="68" r="3.8" fill="#1f2937" />
      <circle cx="139" cy="68" r="3.8" fill="#1f2937" />
      <path d="M120 80 q10 10 20 0" stroke="#1f2937" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Hair */}
      <path d="M102 62 q28 -26 58 0 q-6 -20 -28 -20 q-22 0 -30 20z" fill="#1f2937" />

      {/* Body / coat */}
      <path d="M80 180 q0 -60 50 -60 q50 0 50 60" fill="url(#coat)" />
      <rect x="123" y="120" width="14" height="30" rx="3" fill="#64748b" />

      {/* Stethoscope */}
      <path d="M115 95 q-30 20 0 45" stroke="#475569" strokeWidth="3" fill="none" />
      <path d="M145 95 q30 20 0 45" stroke="#475569" strokeWidth="3" fill="none" />
      <circle cx="130" cy="138" r="8" fill="#94a3b8" stroke="#475569" strokeWidth="3" />

      {/* Clipboard */}
      <rect x="165" y="110" width="32" height="44" rx="6" fill="#fef9c3" stroke="#eab308" />
      <rect x="175" y="115" width="12" height="4" rx="2" fill="#eab308" />
      <line x1="170" y1="125" x2="192" y2="125" stroke="#a3a3a3" />
      <line x1="170" y1="133" x2="192" y2="133" stroke="#a3a3a3" />
      <line x1="170" y1="141" x2="192" y2="141" stroke="#a3a3a3" />
    </svg>
  );
}