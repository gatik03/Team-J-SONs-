import { readFileSync, writeFileSync } from 'node:fs';
const [src, out] = process.argv.slice(2);
if (!src || !out) throw new Error('usage: npx tsx src/ai/rag/makePdf.ts <in.md> <out.pdf>');
// Helvetica only covers ASCII: ₹ → "Rs. ", other non-ASCII → "-"
const esc = (s: string) => s.replace(/₹/g, 'Rs. ').replace(/[^\x20-\x7E]/g, '-')
  .replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const lines = readFileSync(src, 'utf8').split('\n').map((l) => l.replace(/^#+\s*/, '').replace(/\*\*/g, ''));
const perPage = 48; const pages: string[][] = [];
for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
const objs: string[] = []; const add = (s: string) => (objs.push(s), objs.length);
const catalog = add(''), pagesObj = add(''), font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
const kids: number[] = [];
for (const p of pages) {
  const body = `BT /F1 10 Tf 14 TL 50 800 Td ${p.map((l) => `(${esc(l)}) '`).join(' ')} ET`;
  const content = add(`<< /Length ${Buffer.byteLength(body)} >>\nstream\n${body}\nendstream`);
  kids.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`));
}
objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
objs[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
let pdf = '%PDF-1.4\n';
const offsets = objs.map((o, i) => { const off = Buffer.byteLength(pdf); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; return off; });
const xref = Buffer.byteLength(pdf);
pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
pdf += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
writeFileSync(out, pdf, 'latin1');
console.log(`wrote ${out} (${kids.length} page(s))`);
