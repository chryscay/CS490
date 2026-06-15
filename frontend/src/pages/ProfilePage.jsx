import { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/useAuth.js';

const API_URL = import.meta.env.VITE_API_URL ?? '';

const EMPTY_FORM = { fullName: '', phone: '', location: '', summary: '' };

export default function ProfilePage() {
  const { currentUser } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('loading'); // loading | ready | saving | saved | error
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!currentUser) {
        return;
      }
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_URL}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error('load failed');
        }
        const data = await res.json();
        if (!active) {
          return;
        }
        const profile = data.profile ?? {};
        setForm({
          fullName: profile.fullName ?? '',
          phone: profile.phone ?? '',
          location: profile.location ?? '',
          summary: profile.summary ?? '',
        });
        setEmail(profile.email ?? currentUser.email ?? '');
        setStatus('ready');
      } catch {
        if (active) {
          setPageError('We could not load your profile. Please refresh.');
          setStatus('error');
        }
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [currentUser]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (status === 'saved') {
      setStatus('ready');
    }
  }

  function validate() {
    const next = {};
    if (!form.fullName.trim()) {
      next.fullName = 'Full name is required';
    }
    if (!form.summary.trim()) {
      next.summary = 'Summary is required';
    }
    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) {
      return;
    }

    try {
      setStatus('saving');
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (res.status === 400) {
        const data = await res.json();
        setErrors(data.errors ?? {});
        setStatus('ready');
        return;
      }
      if (!res.ok) {
        throw new Error('save failed');
      }

      const data = await res.json();
      const profile = data.profile ?? {};
      setForm({
        fullName: profile.fullName ?? '',
        phone: profile.phone ?? '',
        location: profile.location ?? '',
        summary: profile.summary ?? '',
      });
      setErrors({});
      setStatus('saved');
    } catch {
      setPageError('We could not save your changes. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'loading') {
    return (
      <div className="profile">
        <h1 className="profile-title">Profile</h1>
        <p className="profile-muted">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-white">Profile</h1>
        <p className="mt-2 text-white/50">
          Manage your personal information and professional summary.
        </p>
      </div>

      {status === 'error' && pageError && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {pageError}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 space-y-6"
        noValidate
      >
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-white/70 mb-2"
          >
            Email
          </label>

          <input
            id="email"
            type="email"
            value={email}
            readOnly
            className="
            w-full
            rounded-xl
            border
            border-white/10
            bg-white/5
            px-4
            py-4
            text-white/60
          "
          />

          <p className="mt-2 text-sm text-white/40">
            Email is managed through your account.
          </p>
        </div>

        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-white/70 mb-2"
          >
            Full Name
          </label>

          <input
            id="fullName"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            className="
            w-full
            rounded-xl
            border
            border-white/10
            bg-white/5
            px-4
            py-4
            text-white
            placeholder:text-white/40
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500
          "
          />

          {errors.fullName && (
            <p className="mt-2 text-sm text-red-400">{errors.fullName}</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-white/70 mb-2"
            >
              Phone
            </label>

            <input
              id="phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="
              w-full
              rounded-xl
              border
              border-white/10
              bg-white/5
              px-4
              py-4
              text-white
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500
            "
            />
          </div>

          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium text-white/70 mb-2"
            >
              Location
            </label>

            <input
              id="location"
              name="location"
              value={form.location}
              onChange={handleChange}
              className="
              w-full
              rounded-xl
              border
              border-white/10
              bg-white/5
              px-4
              py-4
              text-white
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500
            "
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="summary"
            className="block text-sm font-medium text-white/70 mb-2"
          >
            Professional Summary
          </label>

          <textarea
            id="summary"
            name="summary"
            rows={5}
            value={form.summary}
            onChange={handleChange}
            className="
            w-full
            rounded-xl
            border
            border-white/10
            bg-white/5
            px-4
            py-4
            text-white
            resize-none
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500
          "
          />

          {errors.summary && (
            <p className="mt-2 text-sm text-red-400">{errors.summary}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={status === 'saving'}
            className="
            rounded-xl
            bg-blue-600
            px-6
            py-3
            font-medium
            text-white
            hover:bg-blue-500
            transition
            disabled:opacity-50
          "
          >
            {status === 'saving' ? 'Saving...' : 'Save Profile'}
          </button>

          {status === 'saved' && (
            <span className="text-green-400">Profile saved successfully</span>
          )}
        </div>
      </form>
    </div>
  );
}
