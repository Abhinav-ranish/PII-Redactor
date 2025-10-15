import type { Policy, EntityMatch, EntityType } from "./types";
import { findMatches } from "./patterns";

export const DEFAULT_ENTITIES: EntityType[] = [
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
];

export const DEFAULT_MASK: Partial<Record<EntityType, string>> = {
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
};

export type RedactResult = {
  redacted_text: string;
  entities: EntityMatch[];
  policy: Policy;
};

export function redactText(text: string, policy?: Policy): RedactResult {
  const pol: Policy = {
    mode: policy?.mode ?? "mask",
    entities: policy?.entities ?? DEFAULT_ENTITIES,
    mask_map: { ...DEFAULT_MASK, ...(policy?.mask_map ?? {}) },
  };

  const entities = findMatches(text, pol.entities!);

  let redacted_text = text;
  if (pol.mode === "delete") {
    const parts: string[] = [];
    let last = 0;
    for (const e of entities) {
      if (e.start < last) continue;
      parts.push(text.slice(last, e.start));
      last = e.end;
    }
    parts.push(text.slice(last));
    redacted_text = parts.join("");
  } else {
    const sorted = [...entities].sort((a, b) => b.start - a.start);
    for (const e of sorted) {
      const token = pol.mask_map?.[e.type] ?? `[${e.type}]`;
      redacted_text =
        redacted_text.slice(0, e.start) + token + redacted_text.slice(e.end);
    }
  }

  return { redacted_text, entities, policy: pol };
}
