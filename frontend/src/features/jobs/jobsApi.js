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