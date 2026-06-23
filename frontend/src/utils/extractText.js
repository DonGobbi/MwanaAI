// Pulls usable content out of the materials a teacher uploads — so the AI
// generates lesson plans and quizzes FROM their syllabus / textbook / notes,
// not out of thin air.
//
//   • Images / screenshots  → kept as a data URL and read by the vision model
//   • PDFs                  → text extracted with pdf.js (lazy-loaded)
//   • Word (.docx)          → text extracted with mammoth (lazy-loaded)
//   • Plain text / md / csv → read directly
//
// Heavy libraries are imported lazily so they only load the first time a
// teacher actually uploads a document.
import { fileToDownscaledDataUrl } from './image';

let pdfjsPromise;
async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((pdfjs) => {
      // Use a worker from the CDN that matches the installed version exactly.
      pdfjs.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

const MAX_PDF_PAGES = 30;

async function extractPdfText(file) {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages = Math.min(pdf.numPages, MAX_PDF_PAGES);
  let out = '';
  for (let p = 1; p <= pages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    out += content.items.map((i) => i.str).join(' ') + '\n\n';
  }
  return { text: out.trim(), pages: pdf.numPages };
}

// Extract content from one uploaded file. Returns:
//   { kind, name, text, image }  (text or image is populated, not both)
export async function extractFromFile(file) {
  const name = file.name || 'file';
  const type = file.type || '';

  // Images / screenshots → vision model.
  if (type.startsWith('image/')) {
    const image = await fileToDownscaledDataUrl(file);
    return { kind: 'image', name, text: '', image };
  }

  // PDF.
  if (type === 'application/pdf' || /\.pdf$/i.test(name)) {
    const { text, pages } = await extractPdfText(file);
    if (text.replace(/\s/g, '').length < 40) {
      // Almost no selectable text → it's probably a scanned/photographed PDF.
      throw new Error(
        `"${name}" looks like a scanned PDF (no readable text). Please upload clear photos or screenshots of the pages instead.`
      );
    }
    return { kind: 'pdf', name, text, pages };
  }

  // Word document.
  if (/\.docx$/i.test(name) || type.includes('officedocument.wordprocessingml')) {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    const text = (value || '').trim();
    if (!text) throw new Error(`Could not read any text from "${name}".`);
    return { kind: 'docx', name, text };
  }

  // Plain text-like files.
  if (type.startsWith('text/') || /\.(txt|md|markdown|csv)$/i.test(name)) {
    const text = (await file.text()).trim();
    return { kind: 'text', name, text };
  }

  throw new Error(
    `Unsupported file: "${name}". Upload an image, a PDF, a Word (.docx) or a text file.`
  );
}
