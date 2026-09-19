/**
 * Tiny dependency-free resume file builder for server-side submissions.
 * Builds a real (text-only) PDF for Latin content; falls back to a plain
 * text file when the CV contains non-Latin script (Arabic), because the
 * built-in PDF fonts cannot encode it.
 */

export type ResumeDoc = {
  fullName: string;
  contact: string;
  headline?: string | undefined;
  summary?: string | undefined;
  skills?: string[] | undefined;
  sections?: Array<{ title: string; lines: string[] }> | undefined;
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;
const LINE = 14;
const MAX_CHARS = 92;

function wrap(text: string, max = MAX_CHARS): string[] {
  const out: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if ((line + " " + word).trim().length > max) {
        if (line) out.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    out.push(line);
  }
  return out;
}

export function resumeToLines(doc: ResumeDoc): Array<{ text: string; bold?: boolean }> {
  const lines: Array<{ text: string; bold?: boolean }> = [];
  lines.push({ text: doc.fullName, bold: true });
  if (doc.contact) lines.push({ text: doc.contact });
  if (doc.headline) lines.push({ text: doc.headline });
  lines.push({ text: "" });
  if (doc.summary) {
    for (const l of wrap(doc.summary)) lines.push({ text: l });
    lines.push({ text: "" });
  }
  if (doc.skills?.length) {
    lines.push({ text: "SKILLS", bold: true });
    for (const l of wrap(doc.skills.join(" · "))) lines.push({ text: l });
    lines.push({ text: "" });
  }
  for (const section of doc.sections ?? []) {
    lines.push({ text: section.title.toUpperCase(), bold: true });
    for (const entry of section.lines) for (const l of wrap(entry)) lines.push({ text: l });
    lines.push({ text: "" });
  }
  return lines;
}

export function isLatinOnly(text: string) {
  // eslint-disable-next-line no-control-regex
  return !/[^\u0000-\u024F\u2010-\u203A]/.test(text);
}

function escapePdf(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function latin1(text: string) {
  return text.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, "-").replace(/\u00B7/g, "-");
}

export function buildResumeFile(doc: ResumeDoc): { bytes: Uint8Array; filename: string; contentType: string } {
  const lines = resumeToLines(doc);
  const plain = lines.map((l) => l.text).join("\n");
  const safeName = (doc.fullName || "candidate").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");

  if (!isLatinOnly(plain)) {
    return {
      bytes: new TextEncoder().encode(plain),
      filename: `${safeName}-CV.txt`,
      contentType: "text/plain; charset=utf-8",
    };
  }

  // Paginate
  const perPage = Math.floor((PAGE_H - MARGIN * 2) / LINE);
  const pages: Array<Array<{ text: string; bold?: boolean }>> = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  if (pages.length === 0) pages.push([{ text: doc.fullName }]);

  const objects: string[] = [];
  const pageObjIds = pages.map((_, i) => 4 + i * 2);

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  const boldId = 3 + pages.length * 2 + 1;

  pages.forEach((pageLines, index) => {
    const pageId = pageObjIds[index]!;
    const contentId = pageId + 1;
    let y = PAGE_H - MARGIN;
    let stream = "BT\n";
    for (const line of pageLines) {
      stream += `/${line.bold ? "FB" : "F1"} ${line.bold ? 12 : 10.5} Tf\n1 0 0 1 ${MARGIN} ${y.toFixed(2)} Tm\n(${escapePdf(latin1(line.text))}) Tj\n`;
      y -= LINE;
    }
    stream += "ET";
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /FB ${boldId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });
  objects[boldId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id += 1) {
    const body = objects[id];
    if (!body) continue;
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${body}\nendobj\n`;
  }
  const xrefStart = pdf.length;
  const maxId = objects.length - 1;
  pdf += `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id += 1) {
    pdf += `${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i += 1) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return { bytes, filename: `${safeName}-CV.pdf`, contentType: "application/pdf" };
}
