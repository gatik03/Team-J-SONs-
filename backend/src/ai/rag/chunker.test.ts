import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chunkCsv, chunkJson, chunkMarkdown, chunkPdfText, splitLong } from './chunker';

const kb = (f: string) => readFileSync(new URL(`../../../../db/knowledge/${f}`, import.meta.url), 'utf8');

describe('chunker', () => {
  it('(a) markdown: section = deepest heading, keeps its body', () => {
    const chunks = chunkMarkdown(kb('vehicle-loan-terms-v2026.3.md'), 'Vehicle Loan Terms and Conditions');
    const fc = chunks.find((c) => c.section === 'Foreclosure and Part-Prepayment');
    expect(fc?.content).toContain('after 6 EMIs');
    expect(fc?.metadata.headingPath).toEqual(['Foreclosure and Part-Prepayment']);
    expect(chunks.some((c) => c.section === 'Vehicle Loan Terms and Conditions')).toBe(true);   // preamble → docTitle
    const nested = chunkMarkdown('# T\n## Processing Fee\nfee\n### Processing Fee Illustrations\nex\n## Empty\n  \n', 'T');
    expect(nested.map((c) => [c.section, c.metadata.headingPath])).toEqual([
      ['Processing Fee', ['Processing Fee']], ['Processing Fee Illustrations', ['Processing Fee', 'Processing Fee Illustrations']]]);
  });

  it('(b) splitLong keeps every piece ≤ 800 chars and overlaps', () => {
    const pieces = splitLong('a '.repeat(1000));
    expect(pieces.length).toBeGreaterThan(2);
    for (const p of pieces) expect(p.length).toBeLessThanOrEqual(800);
    const long = chunkMarkdown(`## Big\n${'word '.repeat(400)}`, 'T');
    expect(long.map((c) => c.metadata.part)).toEqual(long.map((_, i) => i + 1));
    expect(long.every((c) => c.section === 'Big')).toBe(true);
  });

  it('(c) CSV with a section column groups by it and repeats the header', () => {
    const chunks = chunkCsv('section,name,fee\nPersonal,PL-101,1.5%\nHome,HL-301,0.5%\nPersonal,PL-102,2%\n', 'Fees');
    expect(chunks.map((c) => c.section)).toEqual(['Personal', 'Home']);
    for (const c of chunks) expect(c.content.split('\n')[0]).toBe('section,name,fee');
    expect(chunks[0]!.content).toContain('name: PL-102; fee: 2%');
    expect(chunkCsv('a,b\n1,2\n3,4\n5,6\n7,8\n9,10\n11,12\n', 'X').map((c) => c.section)).toEqual(['Rows 1–5', 'Rows 6–6']);
  });

  it('(d) JSON: one section per top-level key, flattened paths', () => {
    const chunks = chunkJson(JSON.stringify({ Eligibility: { age: 21, docs: ['PAN', 'ITR'] }, Moratorium: 'Course + 12 months' }), 'Edu');
    expect(chunks.map((c) => c.section)).toEqual(['Eligibility', 'Moratorium']);
    expect(chunks[0]!.content).toContain('Eligibility.age: 21');
    expect(chunks[0]!.content).toContain('Eligibility.docs[1]: ITR');
  });

  it('(e) PDF text: numbered heading without its number', () => {
    const chunks = chunkPdfText('Regulatory Circular Summary\n1. Purpose\nText', 'Regulatory Circular Summary');
    expect(chunks.find((c) => c.section === 'Purpose')?.content).toBe('Text');
  });
});
