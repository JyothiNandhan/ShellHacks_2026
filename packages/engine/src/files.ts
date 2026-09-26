export type Extracted = { status: 'ok'; text: string } | { status: 'unsupported' | 'empty' | 'error'; reason: string };
const plain = new Set('txt csv tsv json md log xml yaml yml html js ts py java c cpp cs go rb php sql sh jsx tsx mjs cjs css rs swift kt'.split(' '));
const unsupported = (): Extracted => ({ status: 'unsupported', reason: "Can't read this file type" });
const result = (text: string): Extracted => text.trim() ? { status: 'ok', text } : { status: 'empty', reason: 'No readable text found' };
export async function extractText(file: File): Promise<Extracted> {
  try {
    if (file.size > 15 * 1024 * 1024) return { status: 'error', reason: 'File too large to check' };
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (plain.has(ext)) return result(await file.text());
    if (ext === 'docx') {
      // Browser build avoids filesystem access in workers and extension pages.
      const { default: mammoth } = await import('mammoth/mammoth.browser.js');
      return result((await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value);
    }
    if (ext !== 'pdf') return unsupported();
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
    // pdf.js v4 removed disableWorker. Its supported fake-worker path uses this
    // handler when native workers cannot be created (including nested workers).
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs');
    (globalThis as typeof globalThis & { pdfjsWorker?: { WorkerMessageHandler: unknown } }).pdfjsWorker ??= worker;
    const loading = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, useSystemFonts: false });
    try {
      const pdf = await loading.promise; const pages: string[] = [];
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n); const content = await page.getTextContent();
        pages.push(content.items.map(item => 'str' in item ? item.str : '').join(' ')); page.cleanup();
      }
      const text = pages.join('\n\n');
      if (!text.trim() || (pdf.numPages > 1 && text.replace(/\s/g, '').length < 20)) return { status: 'empty', reason: 'Looks like a scanned PDF' };
      return result(text);
    } finally { await loading.destroy(); }
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException') return unsupported();
    // Do not surface raw parser exceptions: they may contain document text.
    return { status: 'error', reason: 'Unable to read this file' };
  }
}
