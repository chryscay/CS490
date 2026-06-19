import { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/useAuth.js';

export default function SettingsPage() {
  const { currentUser } = useAuth();

  const [username, setUsername] = useState('Not set');
  const [email, setEmail] = useState('Not set');

  useEffect(() => {
    async function loadProfile() {
      if (!currentUser) {
        return;
      }

      try {
        const token = await currentUser.getIdToken();

        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error('Failed to load profile');
        }

        const data = await res.json();
        const profile = data.profile ?? {};

        setUsername(profile.username ?? 'Not set');
        setEmail(profile.email ?? currentUser.email ?? 'Not set');
      } catch (error) {
        console.error(error);
        setUsername('Not set');
        setEmail(currentUser?.email ?? 'Not set');
      }
    }

    loadProfile();
  }, [currentUser]);

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-white">Settings</h1>

        <p className="mt-2 text-white/50">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="space-y-6">
        <section
          aria-labelledby="account-heading"
          className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8"
        >
          <h2
            id="account-heading"
            className="text-xl font-semibold text-white mb-6"
          >
            Account
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm text-white/50 mb-2">Username</p>

              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-white">
                {username}
              </div>
            </div>

            <div>
              <p className="text-sm text-white/50 mb-2">Email</p>

              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-white">
                {email}
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="preferences-heading"
          className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8"
        >
          <h2
            id="preferences-heading"
            className="text-xl font-semibold text-white mb-4"
          >
            Preferences
          </h2>

          <p className="text-white/50">
            Notification settings, appearance controls, and account preferences
            will be available in a future sprint.
          </p>
        </section>
      </div>
    </div>
  );
}
