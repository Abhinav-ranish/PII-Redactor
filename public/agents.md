# PII Redactor — AI Agent Access

## Overview

PII Redactor is a HIPAA-compliant API for detecting and redacting Personally Identifiable Information (PII) and Protected Health Information (PHI) from text. No authentication required. No data is stored.

**Base URL:** `https://pii.aranish.uk`

## Quick Start

Send a POST request to redact PII from any text:

```bash
curl -X POST https://pii.aranish.uk/api/redact \
  -H "Content-Type: application/json" \
  -d '{
    "text": "John Smith, SSN 437-02-2223, email john@example.com",
    "policy": { "mode": "mask" },
    "return_entities": true
  }'
```

**Response:**
```json
{
  "redacted_text": "[NAME], SSN [SSN], email [EMAIL]",
  "entities": [
    { "type": "PERSON", "text": "John Smith", "start": 0, "end": 10 },
    { "type": "US_SSN", "text": "437-02-2223", "start": 16, "end": 27 },
    { "type": "EMAIL_ADDRESS", "text": "john@example.com", "start": 35, "end": 51 }
  ],
  "policy": { "mode": "mask", "entities": ["PERSON", "EMAIL_ADDRESS", ...] }
}
```

## API Endpoints

### POST /api/redact

Redacts PII/PHI from text input.

**Request Body (JSON):**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `text` | string | Yes | — | Raw text containing PII to redact |
| `policy.mode` | `"mask"` \| `"delete"` | No | `"mask"` | `mask` replaces with tokens, `delete` removes entirely |
| `policy.entities` | string[] | No | All types | Which entity types to redact |
| `policy.mask_map` | object | No | See below | Custom replacement tokens per entity type |
| `return_entities` | boolean | No | `true` | Include detected entity list in response |

**Supported Entity Types:**

| Entity Type | Default Mask | Example Match |
|-------------|-------------|---------------|
| `PERSON` | `[NAME]` | John Smith, Dr. Jane |
| `EMAIL_ADDRESS` | `[EMAIL]` | user@example.com |
| `PHONE_NUMBER` | `[PHONE]` | +1 (555) 123-4567 |
| `US_SSN` | `[SSN]` | 437-02-2223 |
| `CREDIT_CARD` | `[CARD]` | 4111-1111-1111-1111 |
| `DATE_TIME` | `[DATE]` | 01/23/2024, May 15 1980 |
| `IP_ADDRESS` | `[IP]` | 192.168.1.1 |
| `URL` | `[URL]` | https://example.com |
| `ADDRESS` | `[ADDRESS]` | 123 Main St, Phoenix AZ |
| `POSTAL_CODE` | `[ZIP]` | 85001 |
| `LOCATION` | `[LOCATION]` | Phoenix, Arizona |
| `MEDICAL_RECORD_NUMBER` | `[MRN]` | Patient ID 12345 |

## Discovery

- **OpenAPI Spec:** `https://pii.aranish.uk/openapi.yaml`
- **AI Plugin Manifest:** `https://pii.aranish.uk/.well-known/ai-plugin.json`
- **Web UI:** `https://pii.aranish.uk`

## Use Cases for AI Agents

1. **Pre-processing before LLM calls** — Redact PII from user input before sending to external AI models
2. **Compliance pipelines** — Strip PHI from medical transcripts for HIPAA compliance
3. **Data anonymization** — Mask sensitive data in datasets before analysis
4. **Audit logging** — Detect and catalog PII entities in text streams
5. **Multi-step workflows** — Use `delete` mode for clean text, `mask` mode for reversible redaction
