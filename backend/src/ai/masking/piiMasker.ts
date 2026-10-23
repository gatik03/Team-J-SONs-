// M2-8: one masker for prompts, logs and audit rows. Order matters: PAN, then Aadhaar, then account numbers.
const PAN = /\b[A-Z]{5}([0-9]{4})[A-Z]\b/g;
const AADHAAR = /\b\d{4}[ -]?\d{4}[ -]?(\d{4})\b/g;
const ACCOUNT = /\b\d{9,18}\b/g;

export function maskPii(text: string): string {
  return text
    .replace(PAN, 'XXXXX$1X')
    .replace(AADHAAR, 'XXXX-XXXX-$1')
    .replace(ACCOUNT, (m) => 'X'.repeat(m.length - 4) + m.slice(-4));
}

export function maskObject<T>(value: T): T {
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return maskPii(v);
    if (typeof v === 'number' && Number.isInteger(v) && String(Math.abs(v)).length >= 9) return maskPii(String(v));
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object' && !(v instanceof Date)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(value) as T;
}
