import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { axe } from 'vitest-axe';
import * as matchers from 'vitest-axe/matchers';

import RegisterPage from '../features/auth/RegisterPage.jsx';
import CareerPreferencesSection from '../features/profile/sections/CareerPreferencesSection.jsx';
import { AuthContext } from '../features/auth/auth-context.js';

expect.extend(matchers);
// Minimal auth context so components depending on useAuth render without a live Firebase session.
function withAuth(ui) {
  const value = {
    currentUser: { uid: 'test-user', getIdToken: async () => 'test-token' },
    register: async () => {},
  };
  return (
    <AuthContext.Provider value={value}>
      <MemoryRouter>{ui}</MemoryRouter>
    </AuthContext.Provider>
  );
}

const emptyProfile = {
  careerPreferences: {
    targetRoles: [],
    locations: [],
    workMode: '',
    salaryPreference: '',
  },
};

describe('accessibility (axe) — components fixed in S3-019', () => {
  it('RegisterPage has no detectable a11y violations', async () => {
    const { container } = render(withAuth(<RegisterPage />));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('CareerPreferencesSection has no detectable a11y violations', async () => {
    const { container } = render(
      withAuth(<CareerPreferencesSection profile={emptyProfile} onSaved={() => {}} />)
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});