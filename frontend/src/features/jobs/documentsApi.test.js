import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportJobDocument } from './documentsApi';

describe('exportJobDocument', () => {
  let clickSpy;

  beforeEach(() => {
    // jsdom does not implement object URLs; stub them on the window.
    window.URL.createObjectURL = vi.fn(() => 'blob:mock');
    window.URL.revokeObjectURL = vi.fn();

    clickSpy = vi.fn();
    const fakeLink = { href: '', download: '', click: clickSpy, remove: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(fakeLink);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches the export and triggers a browser download (happy path)', async () => {
    const blob = new Blob(['pdf-bytes'], { type: 'application/pdf' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (h) =>
          h === 'Content-Disposition'
            ? 'attachment; filename="My_Resume_v2.pdf"'
            : null,
      },
      blob: vi.fn().mockResolvedValue(blob),
    }));

    const result = await exportJobDocument('job-1', 'doc-1', 'tok', { format: 'pdf' });

    expect(result.filename).toBe('My_Resume_v2.pdf');
    expect(clickSpy).toHaveBeenCalledTimes(1);

    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain('/api/jobs/job-1/documents/doc-1/export');
    expect(url).toContain('format=pdf');
    expect(options.headers.Authorization).toBe('Bearer tok');
  });

  it('includes the version param when provided', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'attachment; filename="doc.txt"' },
      blob: vi.fn().mockResolvedValue(new Blob(['x'])),
    }));

    await exportJobDocument('job-1', 'doc-1', 'tok', { format: 'txt', version: 3 });

    const [url] = fetch.mock.calls[0];
    expect(url).toContain('format=txt');
    expect(url).toContain('version=3');
  });

  it('defaults to pdf and omits version when version is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      blob: vi.fn().mockResolvedValue(new Blob(['x'])),
    }));

    const result = await exportJobDocument('job-1', 'doc-1', 'tok', { version: '' });

    const [url] = fetch.mock.calls[0];
    expect(url).toContain('/api/jobs/job-1/documents/doc-1/export?format=pdf');
    expect(url).not.toContain('version=');
    expect(result.filename).toBe('document.pdf');
  });

  it('throws with the server error message on a failed response (non-happy path)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 'Document version not found' }),
    }));

    await expect(
      exportJobDocument('job-1', 'doc-1', 'tok', { format: 'pdf' })
    ).rejects.toThrow('Document version not found');

    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('throws a fallback error when failed response has no parseable JSON body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockRejectedValue(new Error('bad json')),
    }));

    await expect(
      exportJobDocument('job-1', 'doc-1', 'tok', { format: 'pdf' })
    ).rejects.toThrow('Failed to export document');

    expect(clickSpy).not.toHaveBeenCalled();
  });
});
