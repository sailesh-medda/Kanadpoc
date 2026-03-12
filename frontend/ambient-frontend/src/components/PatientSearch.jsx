import { useState } from "react"
import { getPatient } from "../services/api"

export default function PatientSearch({ setResults }) {

  const [patientId, setPatientId] = useState("")

  const search = async () => {

    const res = await getPatient(patientId)

    setResults(res.data.data)
  }

  return (
    <div className="panel">

      <h2>Search Patient</h2>

      <div className="row">

        <input
          placeholder="Patient ID"
          value={patientId}
          onChange={(e)=>setPatientId(e.target.value)}
        />

        <button onClick={search}>
          Fetch
        </button>

      </div>

    </div>
  )
}