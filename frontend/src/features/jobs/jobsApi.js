const API_URL = import.meta.env.VITE_API_URL ?? '';

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