import { parse } from 'csv-parse/sync';

// M2-2: section-aware chunking. Every chunk keeps the heading it came from so answers can cite it.
export interface Chunk { section: string; content: string; metadata: { headingPath: string[]; part: number } }

export function splitLong(text: string, max = 800, overlap = 100): string[] {
  if (text.length <= max) return [text];
  const out: string[] = [];
  let start = 0;
  for (;;) {
    let end = Math.min(start + max, text.length);
    if (end < text.length) {
      const ws = Math.max(text.lastIndexOf(' ', end), text.lastIndexOf('\n', end));
      if (ws > start + overlap) end = ws;   // cut at the last whitespace before the limit; no whitespace → hard cut
    }
    const piece = text.slice(start, end).trim();
    if (piece) out.push(piece);
    if (end >= text.length) return out;
    start = end - overlap;
  }
}

const sized = (section: string, headingPath: string[], body: string): Chunk[] => {
  const text = body.trim();
  return text ? splitLong(text).map((content, i) => ({ section, content, metadata: { headingPath, part: i + 1 } })) : [];
};

// Walks lines; `heading(line)` returns the new heading path for a heading line, or null for a body line.
function bySections(text: string, docTitle: string, heading: (line: string, path: string[]) => string[] | null | 'skip'): Chunk[] {
  const chunks: Chunk[] = [];
  let path: string[] = []; let body: string[] = [];
  const flush = () => { chunks.push(...sized(path.at(-1) ?? docTitle, path, body.join('\n'))); body = []; };
  for (const line of text.split(/\r?\n/)) {
    const h = heading(line, path);
    if (h === 'skip') continue;
    if (h) { flush(); path = h; } else body.push(line);
  }
  flush();
  return chunks;
}

export function chunkMarkdown(text: string, docTitle: string): Chunk[] {
  return bySections(text, docTitle, (line, path) => {
    if (/^#\s+/.test(line)) return 'skip';   // document title, not a section
    const h2 = /^##\s+(.+?)\s*$/.exec(line);
    if (h2) return [h2[1]!];
    const h3 = /^###\s+(.+?)\s*$/.exec(line);
    if (h3) return [...path.slice(0, 1), h3[1]!];
    return null;
  });
}

const NUMBERED = /^\d+(\.\d+)*\.?\s+[A-Z].{2,80}$/;
const ALL_CAPS = /^[A-Z][A-Z0-9 &,'()\/-]{3,79}$/;
export function chunkPdfText(text: string, docTitle: string): Chunk[] {
  return bySections(text, docTitle, (raw) => {
    const line = raw.trim();
    return NUMBERED.test(line) || ALL_CAPS.test(line) ? [line.replace(/^\d+(\.\d+)*\.?\s+/, '')] : null;
  });
}

export function chunkCsv(text: string, _docTitle: string): Chunk[] {
  const rows = parse(text, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
  if (!rows.length) return [];
  const cols = Object.keys(rows[0]!);
  const groups = new Map<string, Record<string, string>[]>();
  rows.forEach((r, i) => {
    const key = cols.includes('section') ? r.section! : `Rows ${i - (i % 5) + 1}–${Math.min(i - (i % 5) + 5, rows.length)}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  });
  return [...groups].flatMap(([section, rs]) =>
    sized(section, [section], [cols.join(','), ...rs.map((r) => cols.map((c) => `${c}: ${r[c]}`).join('; '))].join('\n')));
}

const flatten = (v: unknown, path: string): string[] =>
  Array.isArray(v) ? v.flatMap((x, i) => flatten(x, `${path}[${i}]`))
    : v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => flatten(x, path ? `${path}.${k}` : k))
      : [`${path}: ${String(v)}`];

export function chunkJson(text: string, docTitle: string): Chunk[] {
  const data: unknown = JSON.parse(text);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return sized(docTitle, [], flatten(data, docTitle).join('\n'));
  return Object.entries(data).flatMap(([key, v]) => sized(key, [key], flatten(v, key).join('\n')));
}
