// src/App.jsx
import { useState } from "react";
import TranscriptForm from "./components/TranscriptForm";
import PatientSearch from "./components/PatientSearch";
import ResultCard from "./components/ResultCard";

import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import SidebarLeft from "./components/layout/SidebarLeft";
import SidebarRight from "./components/layout/SidebarRight";
import DoctorIllustration from "./components/illustrations/DoctorIllustration";

import "./styles/index.css";
import "./styles/App.css";

export default function App() {
  const [results, setResults] = useState(null);

  return (
    <div className="app-shell">
      <Header />

      <div className="app-body">
        <aside className="sidebar sidebar--left">
          <SidebarLeft />
        </aside>

        <main className="content">
          {/* Hero */}
          <section className="hero panel animate-fade-in-up">
            <div className="hero__text">
              <h1>Ambient AI <span className="accent">Medical Assistant</span></h1>
              <p className="muted">
                Capture conversations, generate structured medical reports, and search patient history—
                all in one place.
              </p>
            </div>
            <div className="hero__art">
              <DoctorIllustration />
            </div>
          </section>

          {/* Main input grid */}
          <section className="grid-2">
            <div className="panel animate-fade-in-up delay-1">
              <TranscriptForm setResults={setResults} />
            </div>
            <div className="panel animate-fade-in-up delay-2">
              <PatientSearch setResults={setResults} />
            </div>
          </section>

          {/* Results */}
          {results && (
            <section className="results-grid animate-fade-in-up delay-3">
              <ResultCard
                title="Detailed Medical Report"
                content={results.detailed_report?.result || results.detailed_report}
              />
              <ResultCard
                title="SOP Report"
                content={results.sop_report?.result || results.sop_report}
              />
              <ResultCard
                title="ICD & CPT Codes"
                content={results.icd_cpt_codes?.result || results.icd_cpt_codes}
              />
            </section>
          )}
        </main>

        <aside className="sidebar sidebar--right">
          <SidebarRight />
        </aside>
      </div>

      <Footer />
    </div>
  );
}