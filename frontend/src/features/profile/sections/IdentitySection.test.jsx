import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import IdentitySection from './IdentitySection.jsx';

vi.mock('../../auth/useAuth.js', () => ({
  useAuth: () => ({
    currentUser: { getIdToken: vi.fn().mockResolvedValue('faketoken') },
  }),
}));

const baseProfile = {
  firstName: 'Ada', lastName: 'Lovelace', phone: '', city: '', state: '',
};

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(impl) {
  vi.stubGlobal('fetch', vi.fn(impl));
}

describe('IdentitySection', () => {
  it('renders persisted values from the profile prop (survives refresh)', () => {
    render(<IdentitySection profile={{ ...baseProfile, city: 'London', state: 'NY' }} />);
    expect(screen.getByLabelText('First Name*')).toHaveValue('Ada');
    expect(screen.getByLabelText('City')).toHaveValue('London');
    expect(screen.getByLabelText('State')).toHaveValue('NY');
  });

  it('saves and shows confirmation (happy path)', async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ profile: { ...baseProfile, city: 'London' } }),
    }));

    const onSaved = vi.fn();
    render(<IdentitySection profile={baseProfile} onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'London' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/profile/identity'),
      expect.objectContaining({ method: 'PUT' })
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('blocks save and shows field error on client validation (non-happy)', () => {
    mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ profile: baseProfile }) }));

    render(<IdentitySection profile={baseProfile} />);
    fireEvent.change(screen.getByLabelText('Last Name*'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Last name is required')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('maps a server 400 onto field errors', async () => {
    mockFetch(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ errors: { phone: 'Phone number must be exactly 10 digits' } }),
    }));

    render(<IdentitySection profile={baseProfile} />);
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'London' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Phone number must be exactly 10 digits')).toBeInTheDocument();
  });
});