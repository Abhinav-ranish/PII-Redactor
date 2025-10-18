// app/api/transcribe/route.ts
export const runtime = "edge"; // ✅ replaces deprecated config

export async function POST(req: Request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return new Response("Server misconfigured: GROQ_API_KEY missing", { status: 500 });
  }

  let form: FormData | null = null;
  try {
    form = await req.formData();
  } catch {
    return new Response("Invalid form-data", { status: 400 });
  }
  if (!form || !form.get("file")) {
    return new Response("Missing 'file' field", { status: 400 });
  }

  // Provide sensible defaults if the client didn't send them
  if (!form.get("model")) form.append("model", "whisper-large-v3-turbo");
  if (!form.get("response_format")) form.append("response_format", "text");

  const groq = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    }
  );

  // Stream the Groq response back to the client
  return new Response(groq.body, {
    status: groq.status,
    headers: {
      "content-type":
        groq.headers.get("content-type") ?? "text/plain; charset=utf-8",
    },
  });
}
