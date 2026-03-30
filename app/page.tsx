"use client";
import { useMemo, useRef, useState } from "react";
import { transcribeAudio, pickAudioMime } from "@/lib/groqTranscribe";

type Entity = { type: string; text: string; start: number; end: number; score?: number };
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

const ENTITY_COLORS: Record<string, string> = {
  PERSON: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  EMAIL_ADDRESS: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  PHONE_NUMBER: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  US_SSN: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  CREDIT_CARD: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  DATE_TIME: "text-violet-400 bg-violet-400/10 border-violet-400/20",
  IP_ADDRESS: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  URL: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  ADDRESS: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  POSTAL_CODE: "text-teal-400 bg-teal-400/10 border-teal-400/20",
  LOCATION: "text-lime-400 bg-lime-400/10 border-lime-400/20",
  MEDICAL_RECORD_NUMBER: "text-pink-400 bg-pink-400/10 border-pink-400/20",
};

function ShieldIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#shield-grad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="shield-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
      </defs>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export default function Page() {
  const [raw, setRaw] = useState(
    "Rishi Sunak (Patient ID 69120232) was seen on 01/23/2024. Email chatgpt@asu.edu. He was diagnosed with Jaundice and was given Tylenol to treat his disease. Mr. Rishi complained about loosing his social security (437-02-2223). Contact at +1 (555) 123-4567. Visit https://example.com for more info. His address is 123 Main St, Phoenix, AZ 85001. His birthdate is 1980-05-15 or May 15, 1980."
  );
  const [mode, setMode] = useState<"delete" | "mask">(DEFAULT_POLICY.mode);
  const [out, setOut] = useState("");
  const [ents, setEnts] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEntities, setShowEntities] = useState(false);

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
      setShowEntities(true);
    } catch (e: any) {
      setErr(e?.message || "Redaction failed");
    } finally {
      setLoading(false);
    }
  };

  const onFile = async (f: File) => setRaw(await f.text());
  const count = (type: string) => ents.filter((e) => e.type === type).length;

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

      rec.start(250);
      setRecOn(true);
    } catch (e: any) {
      setErr(e?.message || "Mic permission or recording unsupported");
      setRecOn(false);
    }
  }
  function stopRec() {
    mediaRef.current?.stop();
  }

  const entityTypes = [...new Set(ents.map((e) => e.type))];

  return (
    <main className="min-h-screen py-8 md:py-12">
      <div className="container-page space-y-8">
        {/* Header */}
        <header className="space-y-3">
          <div className="flex items-start gap-4">
            <div className="mt-1 hidden sm:block">
              <ShieldIcon />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold gradient-title tracking-tight">
                PII Redactor
              </h1>
              <p className="text-sm text-zinc-500 mt-1">
                Detect and redact PII/PHI locally before sending to external LLMs.
                HIPAA-compliant regex engine.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-success text-[10px] uppercase tracking-wider font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
                Local
              </span>
            </div>
          </div>
        </header>

        {/* Main grid */}
        <section className="grid lg:grid-cols-2 gap-5">
          {/* ── INPUT CARD ── */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Input</h2>
              <div className="radio-group">
                <button
                  className="radio-pill"
                  data-active={mode === "mask"}
                  onClick={() => setMode("mask")}
                >
                  Mask
                </button>
                <button
                  className="radio-pill"
                  data-active={mode === "delete"}
                  onClick={() => setMode("delete")}
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="glow-ring rounded-xl">
                <textarea
                  className="textarea"
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  placeholder="Paste or type text containing PII..."
                />
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => callApi()}
                  disabled={loading || !raw.trim()}
                  className="btn btn-primary"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Redacting...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      Redact
                    </>
                  )}
                </button>

                {!recOn ? (
                  <button
                    className="btn btn-accent"
                    onClick={startRec}
                    disabled={loading}
                    title="Record and transcribe with Groq"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                      <path d="M19 10v2a7 7 0 01-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                    Record
                  </button>
                ) : (
                  <button className="btn btn-danger pulse-ring" onClick={stopRec}>
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                    Stop
                  </button>
                )}

                <label className="btn btn-outline cursor-pointer">
                  <input
                    hidden
                    type="file"
                    accept=".txt"
                    onChange={(e) => e.target.files && onFile(e.target.files[0])}
                  />
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload
                </label>

                {recOn && (
                  <span className="flex items-center gap-2 text-xs text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    Recording...
                  </span>
                )}
              </div>

              {err && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-sm text-rose-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  {err}
                </div>
              )}
            </div>
          </div>

          {/* ── OUTPUT CARD ── */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Output</h2>
              <div className="flex items-center gap-2">
                {ents.length > 0 && (
                  <span className="badge badge-info text-[10px] font-semibold">
                    {ents.length} found
                  </span>
                )}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(out);
                  }}
                  className="btn btn-outline text-xs py-1.5 px-3"
                  disabled={!out}
                  title="Copy to clipboard"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  Copy
                </button>
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
                  className="btn btn-outline text-xs py-1.5 px-3"
                  disabled={!out}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  JSON
                </button>
              </div>
            </div>
            <div className="card-body">
              <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed bg-zinc-950/60 border border-zinc-800/60 p-4 rounded-xl h-64 overflow-auto text-zinc-300">
                {out || (
                  <span className="text-zinc-600 italic">Redacted text will appear here...</span>
                )}
              </pre>

              {/* Entity breakdown */}
              {ents.length > 0 && (
                <div className="space-y-3">
                  {/* Summary pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {entityTypes.map((type) => (
                      <span
                        key={type}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium border ${
                          ENTITY_COLORS[type] || "text-zinc-400 bg-zinc-400/10 border-zinc-400/20"
                        }`}
                      >
                        <span className="font-semibold">{count(type)}</span>
                        {type.replace(/_/g, " ").toLowerCase()}
                      </span>
                    ))}
                  </div>

                  {/* Expandable detail list */}
                  <button
                    onClick={() => setShowEntities(!showEntities)}
                    className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`transition-transform duration-200 ${showEntities ? "rotate-90" : ""}`}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    {showEntities ? "Hide" : "Show"} entity details
                  </button>

                  {showEntities && (
                    <div className="max-h-48 overflow-auto rounded-xl border border-zinc-800/60 bg-zinc-950/40">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-zinc-800/60 text-zinc-500">
                            <th className="text-left font-medium px-3 py-2">Type</th>
                            <th className="text-left font-medium px-3 py-2">Value</th>
                            <th className="text-right font-medium px-3 py-2">Span</th>
                            {ents.some((e) => e.score != null) && (
                              <th className="text-right font-medium px-3 py-2">Score</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {ents.map((e, i) => (
                            <tr
                              key={i}
                              className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors"
                            >
                              <td className="px-3 py-2">
                                <span
                                  className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-mono font-medium border ${
                                    ENTITY_COLORS[e.type] || "text-zinc-400 bg-zinc-400/10 border-zinc-400/20"
                                  }`}
                                >
                                  {e.type}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-mono text-zinc-300 truncate max-w-[180px]">
                                {e.text}
                              </td>
                              <td className="px-3 py-2 text-right text-zinc-600 font-mono">
                                {e.start}:{e.end}
                              </td>
                              {ents.some((e) => e.score != null) && (
                                <td className="px-3 py-2 text-right font-mono text-zinc-500">
                                  {e.score != null ? e.score.toFixed(2) : "—"}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex items-center justify-between text-[11px] text-zinc-600 border-t border-zinc-800/40 pt-4">
          <span>Heuristic regex engine. Validate outputs for compliance.</span>
          <span className="flex items-center gap-1.5">
            <span className="kbd text-[10px]">Ctrl</span>+<span className="kbd text-[10px]">V</span>
            <span className="text-zinc-700">to paste</span>
          </span>
        </footer>
      </div>
    </main>
  );
}
