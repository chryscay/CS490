import { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/useAuth.js';
import ProfileCompletion from './ProfileCompletion.jsx';

const API_URL = import.meta.env.VITE_API_URL ?? '';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  phone: '',
  city: '',
  state: '',
  summary: '',
};

export default function ProfilePage() {
  const { currentUser } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
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
          firstName: profile.firstName ?? '',
          lastName: profile.lastName ?? '',
          phone: profile.phone ?? '',
          city: profile.city ?? '',
          state: profile.state ?? '',
          summary: profile.summary ?? '',
        });
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

    if (!form.firstName.trim()) {
      next.firstName = 'First name is required';
    }

    if (!form.lastName.trim()) {
      next.lastName = 'Last name is required';
    }

    if (!form.summary.trim()) {
      next.summary = 'Summary is required';
    }

    if (form.phone && !/^\d{10}$/.test(form.phone)) {
      next.phone = 'Phone number must be exactly 10 digits';
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
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        phone: profile.phone ?? '',
        city: profile.city ?? '',
        state: profile.state ?? '',
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
      <div className="mb-6">
        <h1 className="text-4xl font-semibold text-white">Profile</h1>

        <p className="mt-2 text-white/50">Manage your profile information.</p>
      </div>

      {status === 'error' && pageError && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {pageError}
        </div>
      )}

      <ProfileCompletion profile={form} />

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 space-y-6"
        noValidate
      >
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-white/70 mb-2"
            >
              First Name*
            </label>

            <input
              id="firstName"
              name="firstName"
              type="text"
              value={form.firstName}
              onChange={handleChange}
              aria-invalid={errors.firstName ? 'true' : 'false'}
              className="
        w-full
        rounded-xl
        border
        border-white/10
        bg-white/5
        px-4
        py-3
        text-white
        focus:outline-none
        focus:ring-2
        focus:ring-blue-500
      "
            />

            {errors.firstName && (
              <p className="mt-2 text-sm text-red-400">{errors.firstName}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-white/70 mb-2"
            >
              Last Name*
            </label>

            <input
              id="lastName"
              name="lastName"
              type="text"
              value={form.lastName}
              onChange={handleChange}
              aria-invalid={errors.lastName ? 'true' : 'false'}
              className="
        w-full
        rounded-xl
        border
        border-white/10
        bg-white/5
        px-4
        py-3
        text-white
        focus:outline-none
        focus:ring-2
        focus:ring-blue-500
      "
            />

            {errors.lastName && (
              <p className="mt-2 text-sm text-red-400">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
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
              type="tel"
              value={form.phone}
              onChange={(e) => {
                const digitsOnly = e.target.value
                  .replace(/\D/g, '')
                  .slice(0, 10);

                setForm((prev) => ({
                  ...prev,
                  phone: digitsOnly,
                }));
              }}
              maxLength={10}
              className="
    w-full
    rounded-xl
    border
    border-white/10
    bg-white/5
    px-4
    py-3
    text-white
    focus:outline-none
    focus:ring-2
    focus:ring-blue-500
  "
            />

            {errors.phone && (
              <p className="mt-2 text-sm text-red-400">{errors.phone}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="city"
              className="block text-sm font-medium text-white/70 mb-2"
            >
              City
            </label>

            <input
              id="city"
              name="city"
              type="text"
              value={form.city}
              onChange={handleChange}
              className="
        w-full
        rounded-xl
        border
        border-white/10
        bg-white/5
        px-4
        py-3
        text-white
        focus:outline-none
        focus:ring-2
        focus:ring-blue-500
      "
            />
          </div>

          <div>
            <label
              htmlFor="state"
              className="block text-sm font-medium text-white/70 mb-2"
            >
              State
            </label>

            <select
              id="state"
              name="state"
              value={form.state}
              onChange={handleChange}
              className="
    w-full
    rounded-xl
    border
    border-white/10
    bg-[#1a1a1a]
    text-white
    px-4
    py-3
    focus:outline-none
    focus:ring-2
    focus:ring-blue-500
  "
            >
              <option value="">Select State</option>
              <option value="AL">Alabama</option>
              <option value="AK">Alaska</option>
              <option value="AZ">Arizona</option>
              <option value="AR">Arkansas</option>
              <option value="CA">California</option>
              <option value="CO">Colorado</option>
              <option value="CT">Connecticut</option>
              <option value="DE">Delaware</option>
              <option value="FL">Florida</option>
              <option value="GA">Georgia</option>
              <option value="HI">Hawaii</option>
              <option value="ID">Idaho</option>
              <option value="IL">Illinois</option>
              <option value="IN">Indiana</option>
              <option value="IA">Iowa</option>
              <option value="KS">Kansas</option>
              <option value="KY">Kentucky</option>
              <option value="LA">Louisiana</option>
              <option value="ME">Maine</option>
              <option value="MD">Maryland</option>
              <option value="MA">Massachusetts</option>
              <option value="MI">Michigan</option>
              <option value="MN">Minnesota</option>
              <option value="MS">Mississippi</option>
              <option value="MO">Missouri</option>
              <option value="MT">Montana</option>
              <option value="NE">Nebraska</option>
              <option value="NV">Nevada</option>
              <option value="NH">New Hampshire</option>
              <option value="NJ">New Jersey</option>
              <option value="NM">New Mexico</option>
              <option value="NY">New York</option>
              <option value="NC">North Carolina</option>
              <option value="ND">North Dakota</option>
              <option value="OH">Ohio</option>
              <option value="OK">Oklahoma</option>
              <option value="OR">Oregon</option>
              <option value="PA">Pennsylvania</option>
              <option value="RI">Rhode Island</option>
              <option value="SC">South Carolina</option>
              <option value="SD">South Dakota</option>
              <option value="TN">Tennessee</option>
              <option value="TX">Texas</option>
              <option value="UT">Utah</option>
              <option value="VT">Vermont</option>
              <option value="VA">Virginia</option>
              <option value="WA">Washington</option>
              <option value="WV">West Virginia</option>
              <option value="WI">Wisconsin</option>
              <option value="WY">Wyoming</option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="summary"
            className="block text-sm font-medium text-white/70 mb-2"
          >
            Professional Summary*
          </label>

          <textarea
            id="summary"
            name="summary"
            rows={4}
            value={form.summary}
            onChange={handleChange}
            aria-invalid={errors.summary ? 'true' : 'false'}
            className="
      w-full
      rounded-xl
      border
      border-white/10
      bg-white/5
      px-4
      py-3
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
            <span role="status" className="text-green-400 text-sm font-medium">
              Profile saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
