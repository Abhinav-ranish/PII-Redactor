# PII Redactor (Next.js) — Med Privacy Filter

Delete or mask PII/PHI from text **before** sending it to public LLMs. Paste/upload transcripts in the UI or call the JSON API. Safe-by-default **delete** mode with optional **mask** tokens.

> Built with Next.js (App Router), TypeScript, Tailwind. No external AI calls required.

> https://pii.aranish.uk

![screenshot](docs/image.png)

## Features

- **Two ways to use**: web UI (paste/upload .txt) + **POST /api/redact** (JSON in/out)
- **Entities covered (configurable)**: PERSON (heuristic), EMAIL, PHONE, SSN, MRN, CREDIT CARD, DATE, IP, URL, ADDRESS, ZIP, LOCATION
- **Policies**: `delete` (drop spans) or `mask` with tokens (e.g., `[NAME]`, `[DATE]`)
- **Audit trail**: returns matched entities with type + indices
- **Local-first**: no network calls; easy to self-host

## Tech

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (custom utility classes for cards/buttons)
- Simple heuristics/regex (no heavy models)

## Quick Start

```bash
npm i
npm run dev
# open http://localhost:3000
```

## API

`POST /api/redact`

**Request**

```json
{
  "text": "Jane Doe MRN 1234567 visited 01/23/2024. Email jane@x.com",
  "policy": { "mode": "mask" },
  "return_entities": true
}
```

**Response**

```json
{
  "redacted_text": "[NAME] [MRN] visited [DATE]. Email [EMAIL]",
  "entities": [
    {"type":"PERSON","text":"Jane Doe","start":0,"end":8},
    {"type":"MEDICAL_RECORD_NUMBER","text":"1234567","start":12,"end":19},
    {"type":"DATE_TIME","text":"01/23/2024","start":29,"end":39},
    {"type":"EMAIL_ADDRESS","text":"jane@x.com","start":48,"end":58}
  ],
  "policy": { "mode": "mask", "entities": [...] }
}
```

## Config

- **Patterns**: `lib/patterns.ts`
- **Defaults (entities/masks)**: `lib/redact.ts`
- **UI**: `app/page.tsx`
- **API route**: `app/api/redact/route.ts`

## Security Notes

- Default policy is **delete** to minimize leakage if output is forwarded to LLMs.
- Review/adjust regexes for your facility (MRN/DOB formats vary).
- Consider adding:

  - **Auth** (token header) on `/api/redact`
  - **Rate limiting** (middleware/reverse proxy)
  - **Luhn** check for credit cards
  - **Allow/Deny lists** (proper nouns, clinical terms)

## Roadmap

- PDF/DOCX ingestion → text → redaction → download
- Highlight entities inline in the output text
- Optional on-device NER (e.g., transformers.js) for higher recall
- Unit tests and gold datasets

## Dev Notes

- Favicon: place at `app/favicon.ico`.
- Tailwind + custom classes in `app/globals.css` (`.card`, `.btn`, `.badge`, etc.).

## License

MIT — see `LICENSE`.

---
