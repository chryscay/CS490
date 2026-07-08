const API_URL = import.meta.env.VITE_API_URL ?? '';

// S3-005: export a saved document version as a downloadable file (txt or pdf).
// Unlike the JSON API calls, this returns a file blob and triggers a browser
// download. Defaults to PDF and to the latest version when none is given.
export async function exportJobDocument(jobId, documentId, token, { format = 'pdf', version } = {}) {
  const params = new URLSearchParams({ format });
  if (version !== undefined && version !== null && version !== '') {
    params.set('version', String(version));
  }

  const res = await fetch(
    `${API_URL}/api/jobs/${jobId}/documents/${documentId}/export?${params.toString()}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to export document');
  }

  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : `document.${format}`;

  const blob = await res.blob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return { filename };
}
