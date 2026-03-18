import React, { useState, useRef, useEffect, useCallback } from "react";
import { sendTranscript } from "../services/api";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";

// Your FastAPI base, e.g., http://localhost:3001
const TOKEN_BASE = "http://127.0.0.1:8000";

async function fetchSpeechToken() {
  const res = await fetch(`${TOKEN_BASE}/api/speech/token`);
  if (!res.ok) throw new Error("Failed to retrieve speech token");
  return res.json(); // { token, region }
}

export default function TranscriptForm({ setResults }) {
  const [patientId, setPatientId] = useState("");
  const [transcript, setTranscript] = useState("");  // final lines you will submit
  const [partial, setPartial] = useState("");        // live/interim line
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);

  // ConversationTranscriber instance
  const transcriberRef = useRef(null);

  // Map speakerId -> human-friendly label (Speaker 1, 2, ...)
  const speakerLabelsRef = useRef(new Map());
  const nextSpeakerIndexRef = useRef(1);

  const labelForSpeaker = (speakerId) => {
    if (!speakerId) return "Speaker?";
    const map = speakerLabelsRef.current;
    if (!map.has(speakerId)) {
      map.set(speakerId, `Speaker ${nextSpeakerIndexRef.current++}`);
    }
    return map.get(speakerId);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        patient_id: patientId,
        transcript: transcript.trim(),
      };
      const res = await sendTranscript(payload);
      setResults?.(res.data.workflow_outputs);
    } catch (err) {
      console.error("Error sending transcript:", err);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = useCallback(async () => {
    if (recording) return;
    setRecording(true);

    try {
      // 1) Get short-lived token (do not expose subscription keys in browser)
      const { token, region } = await fetchSpeechToken();

      // 2) Build SpeechConfig from token (browser best practice)
      const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(token, region);
      speechConfig.speechRecognitionLanguage = "en-US";
      // Optional: richer JSON/word timings
      speechConfig.outputFormat = sdk.OutputFormat.Detailed;

      // 3) Microphone input
      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();

      // 4) Create ConversationTranscriber (speaker-aware STT)
      const transcriber = new sdk.ConversationTranscriber(speechConfig, audioConfig);
      transcriberRef.current = transcriber;

      // 5) Session lifecycle (optional logs)
      transcriber.sessionStarted = () => console.log("Session started");
      transcriber.sessionStopped = () => console.log("Session stopped");

      // 6) Interim hypotheses (single line; resets frequently)
      transcriber.transcribing = (_sender, e) => {
        const { speakerId, text } = e.result || {};
        if (!text) return;
        setPartial(`[interim][${labelForSpeaker(speakerId)}] ${text}`);
      };

      // 7) Final results (append to your transcript)
      transcriber.transcribed = (_sender, e) => {
        const { speakerId, text } = e.result || {};
        if (!text) return;
        const who = labelForSpeaker(speakerId);
        setTranscript((prev) => (prev ? `${prev}\n` : "") + `[${who}] ${text}`);
        setPartial(""); // clear interim once a final arrives
      };

      // 8) Error / cancellation handling
      transcriber.canceled = (_sender, e) => {
        console.error("Transcription canceled:", e.errorDetails || "no details");
        setRecording(false);
      };

      // 9) Start the transcription
      transcriber.startTranscribingAsync(
        () => console.log("Transcribing…"),
        (err) => {
          console.error("Start error:", err);
          setRecording(false);
        }
      );
    } catch (err) {
      console.error("Init error:", err);
      setRecording(false);
    }
  }, [recording]);

  const stopRecording = useCallback(() => {
    if (!recording || !transcriberRef.current) return;
    const t = transcriberRef.current;

    t.stopTranscribingAsync(
      () => {
        console.log("Stopped");
        t.close?.();
        transcriberRef.current = null;
        setRecording(false);
        setPartial("");
      },
      (err) => {
        console.error("Stop error:", err);
        setRecording(false);
      }
    );
  }, [recording]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (transcriberRef.current) {
        try {
          transcriberRef.current.stopTranscribingAsync(() => {
            transcriberRef.current?.close?.();
            transcriberRef.current = null;
          });
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return (
    <div className="panel">
      <h1>Ambient AI Medical Assistant</h1>

      <input
        placeholder="Patient ID"
        value={patientId}
        onChange={(e) => setPatientId(e.target.value)}
      />

      {/* Live interim line for on-screen feedback */}
      {partial && (
        <div
          style={{
            margin: "8px 0",
            padding: "8px",
            background: "#f1f5ff",
            borderRadius: 6,
            fontFamily: "monospace",
          }}
        >
          {partial}
        </div>
      )}

      <textarea
        placeholder="Transcript will appear here..."
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        rows={10}
      />

      <div style={{ marginTop: "10px" }}>
        <button onClick={startRecording} disabled={recording}>
          {recording ? "🎤 Recording..." : "🎤 Start Recording"}
        </button>
        <button onClick={stopRecording} disabled={!recording} style={{ marginLeft: "10px" }}>
          ⏹ Stop Recording
        </button>
      </div>

      <button onClick={handleSubmit} style={{ marginTop: "10px" }} disabled={!patientId || !transcript.trim() || loading}>
        {loading ? "Processing..." : "Generate Reports"}
      </button>
    </div>
  );
}