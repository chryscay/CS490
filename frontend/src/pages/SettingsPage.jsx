import { useAuth } from '../features/auth/useAuth.js';

export default function SettingsPage() {
  const { currentUser } = useAuth();

  const displayName = currentUser?.displayName || 'Not set';
  const email = currentUser?.email || 'Not set';

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-white">Settings</h1>

        <p className="mt-2 text-white/50">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Account Card */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Account</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm text-white/50 mb-2">Display Name</p>

              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-white">
                {displayName}
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

        {/* Preferences Card */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          <h2 className="text-xl font-semibold text-white mb-4">Preferences</h2>

          <p className="text-white/50">
            Notification settings, appearance controls, and account preferences
            will be available in a future sprint.
          </p>
        </section>
      </div>
    </div>
  );
}
