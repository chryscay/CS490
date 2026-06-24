const API_URL = import.meta.env.VITE_API_URL ?? '';

export async function loadProfile(token) {
  const res = await fetch(`${API_URL}/api/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('load failed');
  const data = await res.json();
  return data.profile ?? {};
}

// Resolves to { profile } on success or { fieldErrors } on a 400.
// Throws on network/500 so the hook routes it to the error state.
export async function saveProfileSection(section, values, token) {
  const res = await fetch(`${API_URL}/api/profile/${section}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(values),
  });

  if (res.status === 400) {
    const data = await res.json();
    return { fieldErrors: data.errors ?? {} };
  }
  if (!res.ok) throw new Error('save failed');

  const data = await res.json();
  return { profile: data.profile ?? {} };
}