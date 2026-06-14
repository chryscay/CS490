import { useAuth } from "../features/auth/useAuth.js";

export default function SettingsPage() {
  const { currentUser } = useAuth();

  const displayName = currentUser?.displayName || "Not set";
  const email = currentUser?.email || "Not set";

  return (
    <div className="settings-page max-w-2xl p-6">
      <h1>Settings</h1>

      <section className="mt-6" aria-labelledby="account-heading">
        <h2 id="account-heading">Account</h2>
        <dl className="mt-2 space-y-3">
          <div>
            <dt className="font-semibold">Display name</dt>
            <dd className="m-0">{displayName}</dd>
          </div>
          <div>
            <dt className="font-semibold">Email</dt>
            <dd className="m-0">{email}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6" aria-labelledby="preferences-heading">
        <h2 id="preferences-heading">Preferences</h2>
        <p className="mt-2">
          Notification and display preferences are coming in a later sprint.
        </p>
      </section>
    </div>
  );
}