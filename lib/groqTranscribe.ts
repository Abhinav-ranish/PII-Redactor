// lib/groqTranscribe.ts
type TranscribeOpts = {
  model?: string;
  language?: string | null;
  verbose_json?: boolean; // if true, returns Groq JSON
  temperature?: number;
  mime?: string;
};

export async function transcribeAudio(
  blob: Blob,
  opts: TranscribeOpts = {}
): Promise<{ text: string } | any> {
  const {
    model = "whisper-large-v3-turbo",
    language = "en",
    verbose_json = false,
    temperature = 0.0,
    mime,
  } = opts;

  const type = mime || blob.type || "audio/webm";
  const suffix =
    type === "audio/webm"
      ? ".webm"
      : type === "audio/ogg"
      ? ".ogg"
      : type === "audio/mpeg" || type === "audio/mp3"
      ? ".mp3"
      : type === "video/mp4" || type === "audio/mp4"
      ? ".mp4"
      : type === "audio/wav" || type === "audio/x-wav"
      ? ".wav"
      : ".wav";

  const file = new File([blob], `recording${suffix}`, { type });

  const form = new FormData();
  form.append("file", file);
  form.append("model", model);
  form.append("temperature", String(temperature));
  if (language) form.append("language", language);
  form.append("response_format", verbose_json ? "verbose_json" : "text");

  // 🔒 call your server route, not Groq directly
  const resp = await fetch("/api/transcribe", {
    method: "POST",
    body: form,
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(
      `Groq transcribe ${resp.status}: ${detail || resp.statusText}`
    );
  }

  if (verbose_json) return await resp.json(); // object-like
  const text = await resp.text(); // plain text
  return { text };
}

// Optional helper: pick a supported recorder MIME
export function pickAudioMime(): string {
  const prefs = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
    "audio/mpeg",
    "audio/wav",
  ];
  for (const m of prefs) {
    // Some browsers (iOS) don’t expose this; guard with optional chaining
    if ((window as any).MediaRecorder?.isTypeSupported?.(m)) return m;
  }
  return "audio/webm";
}
