import React, { useState, useRef, useEffect, useCallback } from "react";
import { sendTranscript } from "../services/api";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";

// Point to your FastAPI
const TOKEN_BASE = "http://127.0.0.1:8000";

async function fetchSpeechToken() {
  const res = await fetch(`${TOKEN_BASE}/api/speech/token`);
  if (!res.ok) throw new Error("Failed to retrieve speech token");
  return res.json(); // { token, region }
}

export default function TranscriptForm({ setResults }) {
  const [patientId, setPatientId] = useState("");
  const [transcript, setTranscript] = useState("");   // final lines
  const [partial, setPartial] = useState("");         // interim line
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);

  const [connId, setConnId] = useState("");
  const [diag, setDiag] = useState("");               // UI diagnostics
  const noAudioTimerRef = useRef(null);
  const tokenFetchedAtRef = useRef(0);

  const transcriberRef = useRef(null);

  // Speaker labels
  const speakerLabelsRef = useRef(new Map());
  const nextSpeakerIndexRef = useRef(1);
  const labelForSpeaker = (speakerId) => {
    if (!speakerId) return "Speaker?";
    const map = speakerLabelsRef.current;
    if (!map.has(speakerId)) map.set(speakerId, `Speaker ${nextSpeakerIndexRef.current++}`);
    return map.get(speakerId);
  };

  const logDiag = (msg) => {
    console.log(msg);
    setDiag((d) => (d ? d + "\n" : "") + msg);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = { patient_id: patientId, transcript: transcript.trim() };
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
    setDiag("");
    setConnId("");

    try {
      // Fetch token (refresh if older than ~8 minutes)
      const now = Date.now();
      if (!tokenFetchedAtRef.current || now - tokenFetchedAtRef.current > 8 * 60 * 1000) {
        logDiag("Fetching fresh Speech token…");
        const { token, region } = await fetchSpeechToken();
        tokenFetchedAtRef.current = now;

        // Build SpeechConfig from token
        const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(token, region);
        speechConfig.speechRecognitionLanguage = "en-US";
        speechConfig.outputFormat = sdk.OutputFormat.Detailed;
        // Optional: enables audio logging server-side for deeper troubleshooting
        // speechConfig.enableAudioLogging();

        // Mic input
        const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();

        // Create transcriber
        const transcriber = new sdk.ConversationTranscriber(speechConfig, audioConfig);
        transcriberRef.current = transcriber;

        // Grab ConnectionId as soon as possible
        try {
          const cid = transcriber.properties.getProperty(
            sdk.PropertyId.SpeechServiceConnection_ConnectionId
          );
          if (cid) setConnId(cid);
        } catch {}

        // Session + speech boundary events
        transcriber.sessionStarted = (_s, e) => logDiag("sessionStarted");
        transcriber.sessionStopped = (_s, e) => logDiag("sessionStopped");

        transcriber.speechStartDetected = () => {
          logDiag("speechStartDetected (we're receiving audio)");
          clearTimeout(noAudioTimerRef.current);
        };
        transcriber.speechEndDetected = () => logDiag("speechEndDetected");

        // Interim results
        transcriber.transcribing = (_sender, e) => {
          const { speakerId, text } = e.result || {};
          if (!text) return;
          const who = labelForSpeaker(speakerId);
          console.log("[interim]", who, text);
          setPartial(`[interim][${who}] ${text}`);
        };

        // Final results
        transcriber.transcribed = (_sender, e) => {
          const { speakerId, text } = e.result || {};
          if (!text) return;
          const who = labelForSpeaker(speakerId);
          console.log("[final]", who, text);
          setTranscript((prev) => (prev ? `${prev}\n` : "") + `[${who}] ${text}`);
          setPartial("");
        };

        // Canceled (errors / token / TLS / region mismatches end up here)
        transcriber.canceled = (_sender, e) => {
          // e.errorDetails may be empty; statusCode is useful as well
          const status = e.errorDetails || "(no details)";
          logDiag(`canceled: ${status}`);
          setRecording(false);
        };

        // Start
        transcriber.startTranscribingAsync(
          () => {
            logDiag("startTranscribingAsync → OK");
            // Watchdog: if we don’t detect speech within 10s, guide the user
            clearTimeout(noAudioTimerRef.current);
            noAudioTimerRef.current = setTimeout(() => {
              logDiag(
                "No speech detected yet. Check mic permissions / input device / proxy TLS."
              );
            }, 10000);
          },
          (err) => {
            logDiag("startTranscribingAsync → ERROR: " + err);
            setRecording(false);
          }
        );
      }
    } catch (err) {
      logDiag("Init error: " + (err?.message || String(err)));
      setRecording(false);
    }
  }, [recording]);

  const stopRecording = useCallback(() => {
    clearTimeout(noAudioTimerRef.current);
    if (!recording || !transcriberRef.current) return;
    const t = transcriberRef.current;
    t.stopTranscribingAsync(
      () => {
        logDiag("stopTranscribingAsync → OK");
        t.close?.();
        transcriberRef.current = null;
        setRecording(false);
        setPartial("");
      },
      (err) => {
        logDiag("stopTranscribingAsync → ERROR: " + err);
        setRecording(false);
      }
    );
  }, [recording]);

  // Minimal single-shot test for sanity (bypasses ConversationTranscriber)
  const runOneShotTest = async () => {
    setDiag("");
    try {
      const { token, region } = await fetchSpeechToken();
      const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(token, region);
      speechConfig.speechRecognitionLanguage = "en-US";
      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

      recognizer.recognizeOnceAsync(
        (result) => {
          console.log("[recognizeOnce]", result.text);
          setDiag("recognizeOnceAsync result: " + (result.text || "(empty)"));
          recognizer.close();
        },
        (err) => {
          setDiag("recognizeOnceAsync ERROR: " + err);
          recognizer.close();
        }
      );
    } catch (e) {
      setDiag("One-shot init error: " + e.message);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(noAudioTimerRef.current);
      if (transcriberRef.current) {
        try {
          transcriberRef.current.stopTranscribingAsync(() => {
            transcriberRef.current?.close?.();
            transcriberRef.current = null;
          });
        } catch { /* ignore */ }
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

      {/* Diagnostics */}
      <div style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: 10,
        marginTop: 10,
        fontSize: 13
      }}>
        <div><strong>ConnectionId:</strong> {connId || "(pending)"} </div>
        {diag && (
          <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
            {diag}
          </pre>
        )}
      </div>

      {/* Live interim */}
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
        <button onClick={runOneShotTest} style={{ marginLeft: "10px" }}>
          🎯 One‑shot Test
        </button>
      </div>

      <button
        onClick={handleSubmit}
        style={{ marginTop: "10px" }}
        disabled={!patientId || !transcript.trim() || loading}
      >
        {loading ? "Processing..." : "Generate Reports"}
      </button>
    </div>
  );
}