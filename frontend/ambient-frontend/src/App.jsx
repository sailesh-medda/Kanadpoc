import { useState } from "react"
import TranscriptForm from "./components/TranscriptForm"
import PatientSearch from "./components/PatientSearch"
import ResultCard from "./components/ResultCard"

import "./styles/app.css"

export default function App() {

  const [results, setResults] = useState(null)

  return (

    <div className="container">

      <TranscriptForm setResults={setResults} />

      <PatientSearch setResults={setResults} />

      {results && (

        <div className="results">

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

        </div>

      )}

    </div>
  )
}