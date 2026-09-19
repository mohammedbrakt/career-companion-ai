/**
 * Raw document text extraction. Runs in the Worker runtime, so only
 * pure-JS/WASM extractors are used (no native bindings).
 */

export class UnsupportedCvFileError extends Error {}

export async function extractDocumentText(bytes: Uint8Array, fileType: string, fileName: string): Promise<string> {
  const type = fileType.toLowerCase();
  const name = fileName.toLowerCase();

  if (type.includes("pdf") || name.endsWith(".pdf")) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const doc = await getDocumentProxy(bytes);
    const { text } = await extractText(doc, { mergePages: true });
    return Array.isArray(text) ? (text as string[]).join("\n") : (text as string);
  }

  if (type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md")) {
    return new TextDecoder().decode(bytes);
  }

  throw new UnsupportedCvFileError("unsupported_file_type");
}

/** Documents longer than this are truncated before hitting the model. */
export function clampCvText(text: string, maxChars = 24000): string {
  const cleaned = text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return cleaned.length > maxChars ? cleaned.slice(0, maxChars) : cleaned;
}
