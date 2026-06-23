import { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/useAuth.js';
import ProfileCompletion from './ProfileCompletion.jsx';
import IdentitySection from '../features/profile/sections/IdentitySection.jsx';
import SummarySection from '../features/profile/sections/SummarySection.jsx';
import EducationSection from '../features/profile/sections/EducationSection.jsx';
import { loadProfile } from '../features/profile/profileApi.js';

const EMPTY_PROFILE = {
  firstName: '',
  lastName: '',
  phone: '',
  city: '',
  state: '',
  summary: '',
  education: [],
};

export default function ProfilePage() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [status, setStatus] = useState('loading');
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    let active = true;

    async function run() {
      if (!currentUser) return;

      try {
        const token = await currentUser.getIdToken();
        const loaded = await loadProfile(token);

        if (!active) return;

        setProfile({ ...EMPTY_PROFILE, ...loaded });
        setStatus('ready');
      } catch {
        if (active) {
          setPageError('We could not load your profile. Please refresh.');
          setStatus('error');
        }
      }
    }

    run();
    return () => {
      active = false;
    };
  }, [currentUser]);

  function handleSectionSaved(updated) {
    setProfile((prev) => ({ ...prev, ...updated }));
  }

  if (status === 'loading') {
    return (
      <div className="max-w-4xl">
        <h1 className="text-4xl font-semibold text-white">Profile</h1>
        <p className="mt-2 text-white/50">Loading your profile...</p>
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

      <ProfileCompletion profile={profile} />

      <div className="space-y-6">
        <IdentitySection profile={profile} onSaved={handleSectionSaved} />
        <SummarySection profile={profile} onSaved={handleSectionSaved} />
        <EducationSection profile={profile} onSaved={handleSectionSaved} />
      </div>
    </div>
  );
}
