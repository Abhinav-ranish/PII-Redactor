"use client";
import { useMemo, useRef, useState } from "react";
import { transcribeAudio, pickAudioMime } from "@/lib/groqTranscribe"; // adjust path if needed

type Entity = { type: string; text: string; start: number; end: number };
type Policy = {
  mode: "delete" | "mask";
  entities?: string[];
  mask_map?: Record<string, string>;
};

const DEFAULT_POLICY: Policy = {
  mode: "mask",
  entities: [
    "PERSON",
    "EMAIL_ADDRESS",
    "PHONE_NUMBER",
    "US_SSN",
    "CREDIT_CARD",
    "DATE_TIME",
    "IP_ADDRESS",
    "URL",
    "ADDRESS",
    "POSTAL_CODE",
    "LOCATION",
    "MEDICAL_RECORD_NUMBER",
  ],
  mask_map: {
    PERSON: "[NAME]",
    EMAIL_ADDRESS: "[EMAIL]",
    PHONE_NUMBER: "[PHONE]",
    US_SSN: "[SSN]",
    CREDIT_CARD: "[CARD]",
    DATE_TIME: "[DATE]",
    IP_ADDRESS: "[IP]",
    URL: "[URL]",
    ADDRESS: "[ADDRESS]",
    POSTAL_CODE: "[ZIP]",
    LOCATION: "[LOCATION]",
    MEDICAL_RECORD_NUMBER: "[MRN]",
  },
};

export default function Page() {
  const [raw, setRaw] = useState(
    "Rishi Sunak (Patient ID 69120232) was seen on 01/23/2024. Email chatgpt@asu.edu. He was diagnosed with Jaundice and was given Tylenol to treat his disease. Mr. Rishi complained about loosing his social security (437-02-2223). Contact at +1 (555) 123-4567. Visit https://example.com for more info. His address is 123 Main St, Phoenix, AZ 85001. His birthdate is 1980-05-15 or May 15, 1980."
  );
  const [mode, setMode] = useState<"delete" | "mask">(DEFAULT_POLICY.mode);
  const [out, setOut] = useState("");
  const [ents, setEnts] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);

  // recording UI state
  const [recOn, setRecOn] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const policy = useMemo(() => ({ ...DEFAULT_POLICY, mode }), [mode]);

  const callApi = async (text?: string) => {
    setLoading(true);
    setErr(null);
    try {
      const bodyText = text ?? raw;
      const res = await fetch("/api/redact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: bodyText, policy, return_entities: true }),
      });
      const j = await res.json();
      setOut(j.redacted_text || "");
      setEnts(j.entities || []);
    } catch (e: any) {
      setErr(e?.message || "Redaction failed");
    } finally {
      setLoading(false);
    }
  };

  const onFile = async (f: File) => setRaw(await f.text());
  const count = (type: string) => ents.filter((e) => e.type === type).length;

  // ---- Recording flow (frontend-only Groq) ----
  async function startRec() {
    try {
      setErr(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickAudioMime();
      const rec = new MediaRecorder(stream, { mimeType });
      mediaRef.current = rec;
      chunksRef.current = [];

      rec.ondataavailable = (ev) => {
        if (ev.data?.size) chunksRef.current.push(ev.data);
      };

      rec.onstop = async () => {
        try {
          const type = rec.mimeType || "audio/webm";
          const blob = new Blob(chunksRef.current, { type });
          const result = await transcribeAudio(blob, { mime: type });
          const text = (result && "text" in result) ? result.text : (result ?? "");
          const newInput = (raw ? raw + "\n" : "") + (text || "");
          setRaw(newInput);
          // auto-redact after transcription
          await callApi(newInput);
        } catch (e: any) {
          setErr(e?.message || "Transcription failed");
        } finally {
          stream.getTracks().forEach((t) => t.stop());
          setRecOn(false);
          mediaRef.current = null;
          chunksRef.current = [];
        }
      };

      rec.start(250); // small chunks help Safari
      setRecOn(true);
    } catch (e: any) {
      setErr(e?.message || "Mic permission or recording unsupported");
      setRecOn(false);
    }
  }
  function stopRec() {
    mediaRef.current?.stop();
  }
return (
  <main className="min-h-screen py-10">
    <div className="container-page space-y-8">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-black gradient-title">
              PII Redactor (HIPPA Compliant)
            </h1>
            <p className="text-slate-600">
              Delete or mask PII/PHI locally before sending to external LLMs.
            </p>
          </div>
        </div>
      </header>

      <section className="grid lg:grid-cols-2 gap-6">
        {/* INPUT */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold">Input</h2>
            <div className="flex items-center gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "delete"}
                  onChange={() => setMode("delete")}
                />{" "}
                Delete
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "mask"}
                  onChange={() => setMode("mask")}
                />{" "}
                Mask
              </label>
            </div>
          </div>
          <div className="card-body">
            <textarea
              className="textarea"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />

            <div className="flex items-center gap-3 flex-wrap">
              <label className="btn btn-outline cursor-pointer">
                <input
                  hidden
                  type="file"
                  accept=".txt"
                  onChange={(e) => e.target.files && onFile(e.target.files[0])}
                />
                Upload .txt
              </label>

              {/* Record button placed next to Choose .txt */}
              {!recOn ? (
                <button
                  className="btn btn-accent"
                  onClick={startRec}
                  disabled={loading}
                  title="Record and transcribe with Groq"
                >
                  🎙️ Record
                </button>
              ) : (
                <button className="btn" onClick={stopRec} title="Stop recording">
                  ⏹️ Stop
                </button>
              )}

              <button
                onClick={() => callApi()}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? "Redacting…" : "Redact"}
              </button>

              {/* small status pill */}
              <span className="text-xs text-slate-500 flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    recOn ? "bg-red-500 animate-pulse" : "bg-slate-400"
                  }`}
                  aria-hidden
                />
                {recOn ? "Recording…" : "Idle"}
              </span>

              <span className="text-xs text-slate-500">
                Tip: <span className="kbd">Ctrl</span>+
                <span className="kbd">V</span> to paste transcripts
              </span>
            </div>

            {err && (
              <p className="text-sm text-rose-500 mt-2">{err}</p>
            )}
          </div>
        </div>

        {/* OUTPUT */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold">Output</h2>
            <button
              onClick={() => {
                const blob = new Blob(
                  [JSON.stringify({ input: raw, output: out, entities: ents }, null, 2)],
                  { type: "application/json" }
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "redaction.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="btn btn-outline text-sm"
            >
              Download JSON
            </button>
          </div>
          <div className="card-body">
            <pre className="whitespace-pre-wrap text-sm bg-slate-50 p-3 rounded-xl border h-64 overflow-auto">
              {out || "— redacted text will appear here —"}
            </pre>
            <details className="text-sm">
              <summary className="cursor-pointer select-none">
                Entities ({ents.length})
              </summary>
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <span className="badge badge-info">Names: {count("PERSON")}</span>
                  <span className="badge badge-info">Emails: {count("EMAIL_ADDRESS")}</span>
                  <span className="badge badge-info">Phones: {count("PHONE_NUMBER")}</span>
                  <span className="badge badge-info">Dates: {count("DATE_TIME")}</span>
                  <span className="badge badge-info">MRN: {count("MEDICAL_RECORD_NUMBER")}</span>
                  <span className="badge badge-info">SSN: {count("US_SSN")}</span>
                </div>
                <ul className="mt-1 max-h-40 overflow-auto space-y-1">
                  {ents.map((e, i) => (
                    <li
                      key={i}
                      className="px-2 py-1 rounded-lg bg-slate-100 flex items-center justify-between"
                    >
                      <span className="font-mono text-xs">{e.type}</span>
                      <span className="truncate max-w-[55%] text-sm">{e.text}</span>
                      <span className="text-slate-500 text-xs">
                        [{e.start},{e.end}]
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          </div>
        </div>
      </section>

      <footer className="text-xs text-slate-500">
        Heuristic regex engine. Validate outputs for compliance; extend patterns for your facility.
      </footer>
    </div>
  </main>
)
};

