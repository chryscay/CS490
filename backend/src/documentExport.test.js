import { describe, it, expect } from 'vitest';
import {
  isValidExportFormat,
  buildExportFilename,
  exportAsTxt,
  buildExport,
} from './lib/documentExport.js';

describe('documentExport', () => {
  describe('isValidExportFormat', () => {
    it('accepts txt and pdf (case-insensitive)', () => {
      expect(isValidExportFormat('txt')).toBe(true);
      expect(isValidExportFormat('pdf')).toBe(true);
      expect(isValidExportFormat('PDF')).toBe(true);
    });
    it('rejects unsupported or malformed formats', () => {
      expect(isValidExportFormat('docx')).toBe(false);
      expect(isValidExportFormat('')).toBe(false);
      expect(isValidExportFormat(undefined)).toBe(false);
      expect(isValidExportFormat(null)).toBe(false);
    });
  });

  describe('buildExportFilename', () => {
    it('builds a safe filename from title, version, and format', () => {
      expect(buildExportFilename('Backend Resume', 3, 'pdf')).toBe('Backend_Resume_v3.pdf');
    });
    it('strips unsafe characters and falls back when title is empty', () => {
      expect(buildExportFilename('a/b\\c:*?', 1, 'txt')).toBe('abc_v1.txt');
      expect(buildExportFilename('', 1, 'txt')).toBe('document_v1.txt');
      expect(buildExportFilename(null, undefined, 'txt')).toBe('document.txt');
    });

    it('does not append a version suffix when version is 0', () => {
      expect(buildExportFilename('Resume', 0, 'txt')).toBe('Resume.txt');
    });
  });

  describe('exportAsTxt', () => {
    it('returns the text as a utf-8 buffer', () => {
      const buf = exportAsTxt('Hello world');
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.toString('utf-8')).toBe('Hello world');
    });
    it('handles empty/missing text safely', () => {
      expect(exportAsTxt('').toString()).toBe('');
      expect(exportAsTxt(undefined).toString()).toBe('');
    });
  });

  describe('buildExport', () => {
    it('builds a txt export with the right content type and filename', async () => {
      const out = await buildExport({ format: 'txt', title: 'My Resume', version: 2, text: 'Body' });
      expect(out.contentType).toBe('text/plain; charset=utf-8');
      expect(out.filename).toBe('My_Resume_v2.txt');
      expect(out.buffer.toString()).toBe('Body');
    });
    it('builds a pdf export that starts with the PDF signature', async () => {
      const out = await buildExport({ format: 'pdf', title: 'My Resume', version: 2, text: 'Body' });
      expect(out.contentType).toBe('application/pdf');
      expect(out.filename).toBe('My_Resume_v2.pdf');
      expect(out.buffer.slice(0, 5).toString()).toBe('%PDF-');
    });
    it('throws on an unsupported format', async () => {
      await expect(buildExport({ format: 'docx', title: 'x', version: 1, text: 'y' }))
        .rejects.toThrow('Unsupported export format');
    });

    it('accepts uppercase format values and normalizes output metadata', async () => {
      const out = await buildExport({ format: 'TXT', title: 'My Resume', version: 3, text: 'Body' });
      expect(out.contentType).toBe('text/plain; charset=utf-8');
      expect(out.filename).toBe('My_Resume_v3.txt');
      expect(out.buffer.toString()).toBe('Body');
    });
  });
});
