const API_URL = import.meta.env.VITE_API_URL ?? '';

// S3-001: fetch all documents (resume + cover letter) across all jobs.
export async function getAllDocuments(token) {
  const res = await fetch(`${API_URL}/api/documents`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch documents');
  const data = await res.json();
  return { documents: data.documents };
}

export async function uploadDocument(token, { file, type, title, jobId }) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  if (title?.trim()) {
    formData.append('title', title.trim());
  }

  if (jobId?.trim()) {
    formData.append('jobId', jobId.trim());
  }

  const res = await fetch(`${API_URL}/api/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to upload document');
  }

  return { document: data.document };
}

// S3-008: archive a document (status → archived, versions preserved).
export async function archiveDocument(token, documentId) {
  const res = await fetch(`${API_URL}/api/documents/${documentId}/archive`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to archive document');
  const data = await res.json();
  return { document: data.document };
}

// S3-008: restore an archived document (status → active, versions preserved).
export async function restoreDocument(token, documentId) {
  const res = await fetch(`${API_URL}/api/documents/${documentId}/restore`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to restore document');
  const data = await res.json();
  return { document: data.document };
}

// S3-007: rename a document title (no new version created).
export async function renameDocument(token, documentId, newTitle) {
  const res = await fetch(`${API_URL}/api/documents/${documentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title: newTitle }),
  });
  if (!res.ok) throw new Error('Failed to rename document');
  const data = await res.json();
  return { document: data.document };
}

// S3-007: duplicate a document (new record at version 1 with latest text).
export async function duplicateDocument(token, documentId) {
  const res = await fetch(`${API_URL}/api/documents/${documentId}/duplicate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to duplicate document');
  const data = await res.json();
  return { document: data.document };
}

// Permanent removal — distinct from archive/restore, which is reversible.
export async function deleteDocument(token, documentId) {
  const res = await fetch(`${API_URL}/api/documents/${documentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete document');
  }
  return res.json();
}

// Resolves to { job } on success (200), or
// { requiresConfirmation, fromStage, toStage } on a 409 non-forward block.
// Throws on network/500 so the hook routes it to the error state.
export async function transitionStage(
  id,
  toStage,
  token,
  { confirmOverride = false, note = '' } = {}
) {
  const res = await fetch(`${API_URL}/api/jobs/${id}/transition`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ toStage, confirmOverride, note }),
  });

  if (res.status === 409) {
    const data = await res.json();
    return {
      requiresConfirmation: true,
      fromStage: data.fromStage,
      toStage: data.toStage,
    };
  }

  if (!res.ok) throw new Error('transition failed');

  const data = await res.json();
  return { job: data.job };
}

// S2-011: add an interview entry to a job. 201 -> { job }, 404/400 -> throws.
export async function addInterview(jobId, entry, token) {
  const res = await fetch(`${API_URL}/api/jobs/${jobId}/interviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(entry),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to add interview');
  }

  const data = await res.json();
  return { job: data.job };
}

// S2-011: update an existing interview entry. 200 -> { job }, 404/400 -> throws.
export async function updateInterview(jobId, interviewId, entry, token) {
  const res = await fetch(`${API_URL}/api/jobs/${jobId}/interviews/${interviewId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(entry),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to update interview');
  }

  const data = await res.json();
  return { job: data.job };
}

// S2-012: add a follow-up tied to a job. 201 -> { job }, 404/400 -> throws.
export async function addFollowUp(jobId, entry, token) {
  const res = await fetch(`${API_URL}/api/jobs/${jobId}/followups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(entry),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to add follow-up');
  }
  const data = await res.json();
  return { job: data.job };
}

// S2-012: update (edit or toggle complete) a follow-up. 200 -> { job }, 404/400 -> throws.
export async function updateFollowUp(jobId, followUpId, entry, token) {
  const res = await fetch(`${API_URL}/api/jobs/${jobId}/followups/${followUpId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(entry),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to update follow-up');
  }
  const data = await res.json();
  return { job: data.job };
}

// S2-014: move job to Archived stage, preserving history (S2-BR-009). 200 -> { job }.
export async function archiveJob(jobId, note, token) {
  const res = await fetch(`${API_URL}/api/jobs/${jobId}/archive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ note: note ?? '' }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to archive job');
  }
  const data = await res.json();
  return { job: data.job };
}

// S2-014: restore job from Archived back to previous stage. 200 -> { job }.
export async function restoreJob(jobId, token) {
  const res = await fetch(`${API_URL}/api/jobs/${jobId}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to restore job');
  }
  const data = await res.json();
  return { job: data.job };
}

// SCRUM-52: hard delete (not archive — that's S2-014). 200 -> { id }, 404 -> throws.
export async function deleteJob(id, token) {
  const res = await fetch(`${API_URL}/api/jobs/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error('delete failed');

  const data = await res.json();
  return { id: data.id };
}

export async function generateJobDraft(id, token, { type } = {}) {
  const res = await fetch(`${API_URL}/api/jobs/${id}/ai/draft`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ type }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to generate draft');
  }

  const data = await res.json();
  return { draft: data.draft };
}

export async function rewriteJobDraft(id, token, { type, text, instruction } = {}) {
  const res = await fetch(`${API_URL}/api/jobs/${id}/ai/rewrite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ type, text, instruction }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to rewrite draft');
  }

  const data = await res.json();
  return { draft: data.draft };
}

export async function saveJobDocument(jobId, token, { type, title, text }) {
  const res = await fetch(`${API_URL}/api/jobs/${jobId}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ type, title, text }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to save document draft');
  }

  const data = await res.json();
  return { document: data.document };
}

// S3-010: fetch a single library document's latest version text for inline display.
export async function getDocument(token, documentId, version) {
  const params = new URLSearchParams();
  if (version !== undefined && version !== null && version !== '') {
    params.set('version', String(version));
  }
  const query = params.toString();
  const res = await fetch(`${API_URL}/api/documents/${documentId}${query ? `?${query}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch document');
  }
  const data = await res.json();
  return { document: data.document };
}

// S3-008: list a document's version history (version number, label, date) for a version picker.
export async function getDocumentVersions(token, documentId) {
  const res = await fetch(`${API_URL}/api/documents/${documentId}/versions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch document versions');
  }
  const data = await res.json();
  return { versions: data.versions };
}

// S3-009: link a library document to a job (S3-BR-010, S3-BR-011).
// Returns { job } on success, { requiresConfirmation, currentDocumentTitle } on 409.
export async function linkDocumentToJob(token, jobId, { type, documentId, confirmReplace = false }) {
  const res = await fetch(`${API_URL}/api/jobs/${jobId}/linked-documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ type, documentId, confirmReplace }),
  });

  if (res.status === 409) {
    const data = await res.json();
    return { requiresConfirmation: true, currentDocumentTitle: data.currentDocumentTitle };
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to link document');
  }

  const data = await res.json();
  return { job: data.job };
}

// S3-009: remove a linked document from a job.
export async function unlinkDocumentFromJob(token, jobId, type) {
  const res = await fetch(`${API_URL}/api/jobs/${jobId}/linked-documents/${type}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to unlink document');
  }

  const data = await res.json();
  return { job: data.job };
}

export async function getJobDocuments(jobId, token) {
  const res = await fetch(`${API_URL}/api/jobs/${jobId}/documents`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to load saved documents');
  }

  const data = await res.json();
  return { documents: data.documents };
}


// S3-011: generate AI-assisted company research using user-provided context.
export async function generateCompanyResearch(id, token, { userContext } = {}) {
  const res = await fetch(`${API_URL}/api/jobs/${id}/ai/research`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userContext }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to generate company research');
  }

  const data = await res.json();
  return { research: data.research };
}

// S3-012 persistence: save (edited) research notes onto the job record.
export async function updateResearchNotes(id, token, researchNotes) {
  const res = await fetch(`${API_URL}/api/jobs/${id}/research`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ researchNotes }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to save research notes');
  }

  const data = await res.json();
  return { job: data.job };
}

// S3-013 persistence: save interview prep notes onto the job record.
export async function updateInterviewPrepNotes(id, token, interviewPrepNotes) {
  const res = await fetch(`${API_URL}/api/jobs/${id}/interview-prep`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ interviewPrepNotes }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to save interview prep notes');
  }

  const data = await res.json();
  return { job: data.job };
}




