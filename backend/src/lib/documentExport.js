import PDFDocument from 'pdfkit';

export const EXPORT_FORMATS = new Set(['txt', 'pdf']);

export function isValidExportFormat(format) {
  return typeof format === 'string' && EXPORT_FORMATS.has(format.toLowerCase());
}

export function buildExportFilename(title, version, format) {
  const base = (title ?? 'document')
    .toString()
    .trim()
    .replace(/[^a-z0-9\-_ ]/gi, '')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'document';
  const v = version ? `_v${version}` : '';
  return `${base}${v}.${format.toLowerCase()}`;
}

export function exportAsTxt(text) {
  return Buffer.from(text ?? '', 'utf-8');
}

export function exportAsPdf({ title, text }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      if (title) {
        doc.fontSize(16).text(title.toString());
        doc.moveDown();
      }
      doc.fontSize(11).text(text ?? '', { align: 'left' });
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function buildExport({ format, title, version, text }) {
  const fmt = format.toLowerCase();

  if (fmt === 'txt') {
    return {
      buffer: exportAsTxt(text),
      contentType: 'text/plain; charset=utf-8',
      filename: buildExportFilename(title, version, 'txt'),
    };
  }

  if (fmt === 'pdf') {
    return {
      buffer: await exportAsPdf({ title, text }),
      contentType: 'application/pdf',
      filename: buildExportFilename(title, version, 'pdf'),
    };
  }

  throw new Error('Unsupported export format');
}
