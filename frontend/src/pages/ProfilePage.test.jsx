import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ProfilePage from './ProfilePage.jsx';

const mockUseAuth = vi.fn();
const fetchMock = vi.fn();

vi.mock('../features/auth/useAuth.js', () => ({
  useAuth: () => mockUseAuth(),
}));

function completionText() {
  return screen
    .getByText('Profile Completion')
    .nextElementSibling.textContent.replace(/\s+/g, '');
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockUseAuth.mockReturnValue({
      currentUser: {
        email: 'a@test.com',
        getIdToken: vi.fn().mockResolvedValue('faketoken'),
      },
    });
  });

  it('loads and shows the saved profile across all sections', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        profile: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          phone: '5551234567',
          city: 'London',
          state: 'CA',
          summary: 'Mathematician',
          education: [
            {
              id: 'edu-1',
              schoolName: 'University of Oxford',
              degree: 'Bachelor of Arts',
              fieldOfStudy: 'Mathematics',
              startDate: '2018-09-01',
              endDate: '2021-06-30',
              description: 'Focused on pure mathematics',
            },
          ],
        },
      }),
    });

    render(<ProfilePage />);

    expect(await screen.findByDisplayValue('Ada')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Lovelace')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Mathematician')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Identity & Contact' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Professional Summary' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Education' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('University of Oxford')).toBeInTheDocument();
  });

  it('completion reflects loaded data and updates after a section save (C18)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        profile: { firstName: 'Ada', lastName: '', phone: '', city: '', state: '', summary: '' },
      }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        profile: { firstName: 'Ada', lastName: '', phone: '', city: '', state: '', summary: 'Mathematician' },
      }),
    });

    render(<ProfilePage />);

    await screen.findByDisplayValue('Ada');
    expect(completionText()).toBe('1/3');

    const summaryForm = screen.getByRole('form', { name: 'Professional Summary' });
    fireEvent.change(within(summaryForm).getByLabelText('Professional Summary*'), {
      target: { value: 'Mathematician' },
    });
    fireEvent.click(within(summaryForm).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(completionText()).toBe('2/3'));
  });

  it('each section validates its own required fields independently (validation)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        profile: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          phone: '',
          city: '',
          state: '',
          summary: 'Mathematician',
        },
      }),
    });

    render(<ProfilePage />);
    await screen.findByDisplayValue('Ada');

    const identityForm = screen.getByRole('form', { name: 'Identity & Contact' });
    fireEvent.change(within(identityForm).getByLabelText('First Name*'), {
      target: { value: '' },
    });
    fireEvent.click(within(identityForm).getByRole('button', { name: 'Save' }));
    expect(within(identityForm).getByText('First name is required')).toBeInTheDocument();

    const summaryForm = screen.getByRole('form', { name: 'Professional Summary' });
    fireEvent.change(within(summaryForm).getByLabelText('Professional Summary*'), {
      target: { value: '' },
    });
    fireEvent.click(within(summaryForm).getByRole('button', { name: 'Save' }));
    expect(within(summaryForm).getByText('Summary is required')).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
