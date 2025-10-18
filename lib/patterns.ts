import type { EntityType, EntityMatch } from "./types";

// ---------- helpers ----------
const FW_DIGITS = "\uFF10-\uFF19";         // fullwidth digits ０-９
const UNICODE_DASH = "\u2010-\u2015";      // ‐ - ‒ – —
const DIGIT_CLASS = `0-9${FW_DIGITS}`;

// ---------- patterns ----------
export const PATTERNS: { type: EntityType; re: RegExp; score: number }[] = [
  // Originals
  { type: "EMAIL_ADDRESS", re: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi, score: 0.95 },
  { type: "PHONE_NUMBER",  re: /(?:\+?1[ \-.]?)?(?:\(\d{3}\)|\d{3})[ \-.]?\d{3}[ \-.]?\d{4}\b/g, score: 0.9 },
  { type: "US_SSN",        re: /\b(?!000|666|9\d\d)\d{3}[- ]?(?!00)\d{2}[- ]?(?!0000)\d{4}\b/g, score: 0.95 },
  { type: "CREDIT_CARD",   re: /\b(?:\d[ -]*?){13,19}\b/g, score: 0.6 },
  { type: "DATE_TIME",     re: /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g, score: 0.7 },
  { type: "IP_ADDRESS",    re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, score: 0.9 },
  { type: "URL",           re: /\bhttps?:\/\/[\w.-]+(?:\/[\w./?%&=+-]*)?/gi, score: 0.85 },
  { type: "MEDICAL_RECORD_NUMBER", re: /\b\d{6,12}\b|\b\d{2,3}-\d{2,3}-\d{2,4}\b/g, score: 0.6 },
  { type: "POSTAL_CODE",   re: /\b\d{5}(?:-\d{4})?\b/g, score: 0.5 },
  {
    type: "ADDRESS",
    re: /\b\d{1,5}\s+[A-Za-z0-9'.#-]+\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive|Ct|Court)\b/gi,
    score: 0.5
  },
  {
    type: "LOCATION",
    re: /\b(Phoenix|Tempe|Scottsdale|Arizona|AZ|California|CA|New\s?York|NY|Texas|TX)\b/gi,
    score: 0.4
  },

  // Additions (ported from your Python)
  // Email – robust + obfuscated "at"/"dot"/"space"
  {
    type: "EMAIL_ADDRESS",
    re: /(?:[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})|(?:[A-Za-z0-9._%+-]+(?:\s*space\s*)?\s*(?:@|\bat\b)\s*[A-Za-z0-9-]+(?:\s*(?:\.|\bdot\b|\s*space\s*)\s*[A-Za-z0-9-]+)+)/gi,
    score: 0.97
  },

  // Phone – tolerant fallback
  {
    type: "PHONE_NUMBER",
    re: /\b(?:\+?1[\s.\-]?)?(?:\(?\d{3}\)?|\d{3})[\s.\-]?\d{3}[\s.\-]?\d{4}\b/g,
    score: 0.9
  },

  // SSN with optional literal prefix, supports fullwidth digits
  {
    type: "US_SSN",
    re: new RegExp(String.raw`\b(?:SSN[:\s]*)?([${DIGIT_CLASS}]{3}[-\s][${DIGIT_CLASS}]{2}[-\s][${DIGIT_CLASS}]{4})\b`, "gi"),
    score: 0.96
  },

  // SSN spelled out (simple adversarial)
  {
    type: "US_SSN",
    re: /\bone[-\s]*two[-\s]*three[, ]*four[-\s]*five[, ]*six[-\s]*seven[-\s]*eight[-\s]*nine\b/gi,
    score: 0.6
  },

  // SSN context – digits near "ssn"/"social security number"
  {
    type: "US_SSN",
    re: new RegExp(
      String.raw`(?:\b(?:ssn|social(?:\s+security)?(?:\s+number)?)\b)[^\d]{0,10}([${DIGIT_CLASS}][${DIGIT_CLASS}\s\-\u2010-\u2015]{5,13}[${DIGIT_CLASS}])`,
      "gi"
    ),
    score: 0.9
  },

  // Strict IPv4 0–255
  { type: "IP_ADDRESS", re: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g, score: 0.95 },

  // URL with % # ? =& -
  { type: "URL", re: /\bhttps?:\/\/[\w.-]+(?:\/[\w./%#?=&-]*)?\b/gi, score: 0.9 },

  // MRN / Account / PID
  { type: "MEDICAL_RECORD_NUMBER", re: /\b(?:MRN|Medical\s*Record\s*No\.?|Record\s*#)[:#]?\s*[A-Za-z0-9-]{6,}\b/gi, score: 0.85 },
  // NOTE: Ensure EntityType includes "ACCOUNT_ID" (or change to an existing one you have)
  { type: "ACCOUNT_ID" as EntityType, re: /\b(?:Account|Acct|Member)[:#]?\s*[A-Za-z0-9-]{6,}\b/gi, score: 0.75 },
  // NOTE: Ensure EntityType includes "GENERIC_ID" (or change to an existing one you have)
  { type: "GENERIC_ID" as EntityType, re: /\bPID[-\s]?\d{6,}\b/gi, score: 0.75 },

  // Date shapes
  // "5th of May 2025"
  {
    type: "DATE_TIME",
    re: /\b(\d{1,2})(?:st|nd|rd|th)?\s+of\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s*,?\s*((?:19|20)\d{2})\b/gi,
    score: 0.8
  },
  // "May 5th 2025" / "May 5, 2025"
  {
    type: "DATE_TIME",
    re: /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?)\s*\d{1,2}(?:st|nd|rd|th)?\s*,?\s*((?:19|20)\d{2})\b/gi,
    score: 0.8
  },
  // ISO and d/m/yyyy are already in originals; keep a strict ISO too:
  { type: "DATE_TIME", re: /\b(19|20)\d{2}-\d{2}-\d{2}\b/g, score: 0.8 },

  // Address (street hints) & ZIP (richer)
  {
    type: "ADDRESS",
    re: /\b(\d{1,6}\s+[\w .'-]+?\s+(?:Street|St\.|Road|Rd\.|Avenue|Ave\.|Lane|Ln\.|Blvd\.|Drive|Dr\.|Court|Ct\.|Way|Pkwy|Parkway|Terrace|Ter\.))\b[^\n,]*/gi,
    score: 0.7
  },
  { type: "POSTAL_CODE", re: /\b\d{5}(?:-\d{4})?\b/g, score: 0.6 },
];

// ---------- finder (exports!) ----------
export function findMatches(text: string, allow: EntityType[]): EntityMatch[] {
  const out: EntityMatch[] = [];

  // 1) regex-driven matches
  for (const { type, re, score } of PATTERNS) {
    if (!allow.includes(type)) continue;
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      out.push({
        type,
        text: m[0],
        start: m.index,
        end: m.index + m[0].length,
        score,
      });
      if (!re.global) break;
    }
  }

  // 2) PERSON heuristics (your request)
  if (allow.includes("PERSON" as EntityType)) {
    // Two-word capitalized names (your original heuristic)
    {
      const personRe = /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g;
      let m: RegExpExecArray | null;
      while ((m = personRe.exec(text))) {
        const span = m[0];
        if (/^(Dr\.|MD\b)/.test(span)) continue;
        out.push({
          type: "PERSON" as EntityType,
          text: span,
          start: m.index,
          end: m.index + span.length,
          score: 0.35,
        });
      }
    }

    // Greeting-based single given name: "Hi Ava", "Hello John", "Good morning, Sam"
    {
      const greetRe = /\b(?:Hi|Hey|Hello|Good (?:morning|afternoon|evening))[, ]+\s*([A-Z][a-z]+)\b/g;
      let g: RegExpExecArray | null;
      while ((g = greetRe.exec(text))) {
        const name = g[1];
        const start = g.index + g[0].indexOf(name);
        out.push({
          type: "PERSON" as EntityType,
          text: name,
          start,
          end: start + name.length,
          score: 0.4,
        });
      }
    }

    // Title-based: "Dr. J. Doe", "Mr. John Smith", "Ms. Ana", etc.
    {
      const titleRe = /\b(?:Dr|Mr|Mrs|Ms)\.\s+([A-Z][a-z]+(?:\s+[A-Z]\.)?(?:\s+[A-Z][a-z]+)?)\b/g;
      let t: RegExpExecArray | null;
      while ((t = titleRe.exec(text))) {
        const name = t[1];
        const start = t.index + t[0].indexOf(name);
        out.push({
          type: "PERSON" as EntityType,
          text: name,
          start,
          end: start + name.length,
          score: 0.45,
        });
      }
    }
  }

  // 3) sort + non-overlap filter (keep earlier/longer/higher score)
  out.sort(
    (a, b) =>
      a.start - b.start ||
      (b.end - b.start) - (a.end - a.start) ||
      (b.score ?? 0) - (a.score ?? 0)
  );

  const filtered: EntityMatch[] = [];
  let lastEnd = -1;
  for (const e of out) {
    if (e.start < lastEnd) continue;
    filtered.push(e);
    lastEnd = e.end;
  }
  return filtered;
}
