import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CareerPreferencesSection from './CareerPreferencesSection.jsx';

vi.mock('../../auth/useAuth.js', () => ({
  useAuth: () => ({
    currentUser: { getIdToken: vi.fn().mockResolvedValue('faketoken') },
  }),
}));

function mockFetch(impl) {
  vi.stubGlobal('fetch', vi.fn(impl));
}

describe('CareerPreferencesSection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders persisted career preference values from profile', () => {
    render(
      <CareerPreferencesSection
        profile={{
          careerPreferences: {
            targetRoles: [{ id: 'role-1', name: 'Software Engineer' }],
            locations: [{ id: 'loc-1', name: 'San Francisco, CA' }],
            workMode: 'Remote',
            salaryPreference: '$100,000 - $150,000',
          },
        }}
      />
    );

    expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument();
    expect(screen.getByDisplayValue('San Francisco, CA')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Remote')).toBeInTheDocument();
    expect(screen.getByDisplayValue('$100,000 - $150,000')).toBeInTheDocument();
  });

  it('allows adding a target role', async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ profile: { careerPreferences: { targetRoles: [], locations: [], workMode: '', salaryPreference: '' } } }),
    }));

    render(
      <CareerPreferencesSection
        profile={{ careerPreferences: { targetRoles: [], locations: [], workMode: '', salaryPreference: '' } }}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: /add role/i })[0]);
    expect(screen.getByPlaceholderText(/e.g., Software Engineer/i)).toBeInTheDocument();
  });

  it('allows deleting a target role', async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ profile: { careerPreferences: { targetRoles: [], locations: [], workMode: '', salaryPreference: '' } } }),
    }));

    render(
      <CareerPreferencesSection
        profile={{
          careerPreferences: {
            targetRoles: [{ id: 'role-1', name: 'Engineer' }],
            locations: [],
            workMode: '',
            salaryPreference: '',
          },
        }}
      />
    );

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    expect(screen.queryByDisplayValue('Engineer')).not.toBeInTheDocument();
  });

  it('allows adding a location preference', async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ profile: { careerPreferences: { targetRoles: [], locations: [], workMode: '', salaryPreference: '' } } }),
    }));

    render(
      <CareerPreferencesSection
        profile={{ careerPreferences: { targetRoles: [], locations: [], workMode: '', salaryPreference: '' } }}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: /add location/i })[0]);
    expect(screen.getByPlaceholderText(/e.g., San Francisco, CA/i)).toBeInTheDocument();
  });

  it('allows deleting a location preference', async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ profile: { careerPreferences: { targetRoles: [], locations: [], workMode: '', salaryPreference: '' } } }),
    }));

    render(
      <CareerPreferencesSection
        profile={{
          careerPreferences: {
            targetRoles: [],
            locations: [{ id: 'loc-1', name: 'New York, NY' }],
            workMode: '',
            salaryPreference: '',
          },
        }}
      />
    );

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    expect(screen.queryByDisplayValue('New York, NY')).not.toBeInTheDocument();
  });

  it('shows validation error for blank target role', async () => {
    render(
      <CareerPreferencesSection
        profile={{ careerPreferences: { targetRoles: [], locations: [], workMode: '', salaryPreference: '' } }}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: /add role/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/target role cannot be blank/i)).toBeInTheDocument();
  });

  it('shows validation error for blank location', async () => {
    render(
      <CareerPreferencesSection
        profile={{ careerPreferences: { targetRoles: [], locations: [], workMode: '', salaryPreference: '' } }}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: /add location/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/location cannot be blank/i)).toBeInTheDocument();
  });

  it('allows setting work mode', async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        profile: {
          careerPreferences: {
            targetRoles: [],
            locations: [],
            workMode: 'Hybrid',
            salaryPreference: '',
          },
        },
      }),
    }));

    render(
      <CareerPreferencesSection
        profile={{ careerPreferences: { targetRoles: [], locations: [], workMode: '', salaryPreference: '' } }}
      />
    );

    const workModeSelect = screen.getByDisplayValue('Select work mode (optional)');
    fireEvent.change(workModeSelect, { target: { value: 'Hybrid' } });
    expect(screen.getByDisplayValue('Hybrid')).toBeInTheDocument();
  });

  it('allows setting salary preference', async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        profile: {
          careerPreferences: {
            targetRoles: [],
            locations: [],
            workMode: '',
            salaryPreference: '$80,000 - $120,000',
          },
        },
      }),
    }));

    render(
      <CareerPreferencesSection
        profile={{ careerPreferences: { targetRoles: [], locations: [], workMode: '', salaryPreference: '' } }}
      />
    );

    const salaryInput = screen.getByPlaceholderText(/e.g., \$100,000 - \$150,000/i);
    fireEvent.change(salaryInput, { target: { value: '$80,000 - $120,000' } });
    expect(screen.getByDisplayValue('$80,000 - $120,000')).toBeInTheDocument();
  });

  it('saves through /api/profile/careerPreferences endpoint', async () => {
    let requestUrl;
    let requestBody;

    mockFetch(async (_url, init) => {
      requestUrl = _url;
      requestBody = init.body ? JSON.parse(init.body) : null;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          profile: {
            careerPreferences: {
              targetRoles: [{ id: 'role-1', name: 'Senior Engineer' }],
              locations: [{ id: 'loc-1', name: 'Remote' }],
              workMode: 'Remote',
              salaryPreference: '$120,000+',
            },
          },
        }),
      };
    });

    const onSaved = vi.fn();

    render(
      <CareerPreferencesSection
        profile={{
          careerPreferences: {
            targetRoles: [],
            locations: [],
            workMode: '',
            salaryPreference: '',
          },
        }}
        onSaved={onSaved}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: /add role/i })[0]);
    const roleInput = screen.getByPlaceholderText(/e.g., Software Engineer/i);
    fireEvent.change(roleInput, { target: { value: 'Senior Engineer' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(requestUrl).toContain('/api/profile/careerPreferences');
      expect(requestBody.careerPreferences.targetRoles[0].name).toBe('Senior Engineer');
      expect(onSaved).toHaveBeenCalled();
    });
  });
});
