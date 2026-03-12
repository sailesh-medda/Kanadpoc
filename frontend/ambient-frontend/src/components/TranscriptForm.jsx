import { useState } from "react"
import { sendTranscript } from "../services/api"

export default function TranscriptForm({ setResults }) {

  const [patientId, setPatientId] = useState("")
  const [transcript, setTranscript] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {

    setLoading(true)

    const res = await sendTranscript({
      patient_id: patientId,
      transcript: transcript
    })

    setResults(res.data.workflow_outputs)

    setLoading(false)
  }

  return (
    <div className="panel">

      <h1>Ambient AI Medical Assistant</h1>

      <input
        placeholder="Patient ID"
        value={patientId}
        onChange={(e)=>setPatientId(e.target.value)}
      />

      <textarea
        placeholder="Paste transcript..."
        value={transcript}
        onChange={(e)=>setTranscript(e.target.value)}
      />

      <button onClick={handleSubmit}>
        {loading ? "Processing..." : "Generate Reports"}
      </button>

    </div>
  )
}