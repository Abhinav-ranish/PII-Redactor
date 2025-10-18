// /api/transcribe.ts
export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) return new Response("Server misconfigured", { status: 500 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new Response("Invalid form-data", { status: 400 });
  }
  if (!form.get("file")) {
    return new Response("Missing 'file' field", { status: 400 });
  }

  const groq = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form, // forward as-is
    }
  );

  // Pass through status + content-type; stream the body to the client
  return new Response(groq.body, {
    status: groq.status,
    headers: {
      "content-type":
        groq.headers.get("content-type") || "application/json; charset=utf-8",
    },
  });
}
