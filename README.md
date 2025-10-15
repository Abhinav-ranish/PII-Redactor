# PII Redactor — All-React (Next.js)

Single repo with a React UI and an API route that redacts PII/PHI (delete or mask) using conservative regex/heuristics.

## Quick start
```bash
npm i
npm run dev
# open http://localhost:3000
```

## API
POST `/api/redact`
```json
{ "text": "Jane Doe MRN 1234567 visited 01/23/2024", "policy": { "mode": "mask" }, "return_entities": true }
```

Response:
```json
{ "redacted_text": "...", "entities": [ { "type": "MEDICAL_RECORD_NUMBER", "text": "1234567", "start": 13, "end": 20 } ] }
```

> NOTE: JS heuristics are not as strong as spaCy/Presidio. Tune patterns in `lib/patterns.ts` for your facility.
