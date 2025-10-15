import type { EntityType, EntityMatch } from "./types";

export const PATTERNS: { type: EntityType; re: RegExp; score: number }[] = [
  {
    type: "EMAIL_ADDRESS",
    re: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi,
    score: 0.95,
  },
  {
    type: "PHONE_NUMBER",
    re: /(?:\+?1[ \-.]?)?(?:\(\d{3}\)|\d{3})[ \-.]?\d{3}[ \-.]?\d{4}\b/g,
    score: 0.9,
  },
  {
    type: "US_SSN",
    re: /\b(?!000|666|9\d\d)\d{3}[- ]?(?!00)\d{2}[- ]?(?!0000)\d{4}\b/g,
    score: 0.95,
  },
  { type: "CREDIT_CARD", re: /\b(?:\d[ -]*?){13,19}\b/g, score: 0.6 },
  {
    type: "DATE_TIME",
    re: /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g,
    score: 0.7,
  },
  { type: "IP_ADDRESS", re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, score: 0.9 },
  {
    type: "URL",
    re: /\bhttps?:\/\/[\w.-]+(?:\/[\w./?%&=+-]*)?/gi,
    score: 0.85,
  },
  {
    type: "MEDICAL_RECORD_NUMBER",
    re: /\b\d{6,12}\b|\b\d{2,3}-\d{2,3}-\d{2,4}\b/g,
    score: 0.6,
  },
  { type: "POSTAL_CODE", re: /\b\d{5}(?:-\d{4})?\b/g, score: 0.5 },
  {
    type: "ADDRESS",
    re: /\b\d{1,5}\s+[A-Za-z0-9'.#-]+\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive|Ct|Court)\b/gi,
    score: 0.5,
  },
  {
    type: "LOCATION",
    re: /\b(Phoenix|Tempe|Scottsdale|Arizona|AZ|California|CA|New\s?York|NY|Texas|TX)\b/gi,
    score: 0.4,
  },
];

export function findMatches(text: string, allow: EntityType[]): EntityMatch[] {
  const out: EntityMatch[] = [];
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
  if (allow.includes("PERSON")) {
    const personRe = /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g;
    let m: RegExpExecArray | null;
    while ((m = personRe.exec(text))) {
      const span = m[0];
      if (/^(Dr\.|MD\b)/.test(span)) continue;
      out.push({
        type: "PERSON",
        text: span,
        start: m.index,
        end: m.index + span.length,
        score: 0.35,
      });
    }
  }
  out.sort(
    (a, b) =>
      a.start - b.start ||
      b.end - b.start - (a.end - a.start) ||
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
