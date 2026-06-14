import { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/useAuth.js';
import './ProfilePage.css';

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
    <div className="profile">
      <h1 className="profile-title">Profile</h1>

      {status === 'error' && pageError ? (
        <p className="form-error" role="alert">{pageError}</p>
      ) : null}

      <form className="profile-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="email">Email</label>
          <input className="form-input" id="email" type="email" value={email} readOnly />
          <span className="form-hint">Email comes from your account and isn&apos;t edited here.</span>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="fullName">Full name</label>
          <input
            className="form-input"
            id="fullName"
            name="fullName"
            type="text"
            value={form.fullName}
            onChange={handleChange}
            aria-invalid={errors.fullName ? 'true' : 'false'}
          />
          {errors.fullName ? (
            <span className="form-error" role="alert">{errors.fullName}</span>
          ) : null}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="phone">Phone</label>
          <input
            className="form-input"
            id="phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="location">Location</label>
          <input
            className="form-input"
            id="location"
            name="location"
            type="text"
            value={form.location}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="summary">Summary</label>
          <textarea
            className="form-textarea"
            id="summary"
            name="summary"
            rows={4}
            value={form.summary}
            onChange={handleChange}
            aria-invalid={errors.summary ? 'true' : 'false'}
          />
          {errors.summary ? (
            <span className="form-error" role="alert">{errors.summary}</span>
          ) : null}
        </div>

        <div className="profile-actions">
          <button className="btn-primary" type="submit" disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving...' : 'Save profile'}
          </button>
          {status === 'saved' ? (
            <span className="form-success" role="status">Profile saved</span>
          ) : null}
        </div>
      </form>
    </div>
  );
}