import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import EducationSection from './EducationSection.jsx';

vi.mock('../../auth/useAuth.js', () => ({
  useAuth: () => ({
    currentUser: { getIdToken: vi.fn().mockResolvedValue('faketoken') },
  }),
}));

function mockFetch(impl) {
  vi.stubGlobal('fetch', vi.fn(impl));
}

describe('EducationSection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders persisted education values from profile', () => {
    render(
      <EducationSection
        profile={{
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
        }}
      />
    );

    expect(screen.getByDisplayValue('University of Oxford')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bachelor of Arts')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Mathematics')).toBeInTheDocument();
  });

  it('allows adding and deleting an education record', async () => {
    mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ profile: { education: [] } }) }));

    render(<EducationSection profile={{ education: [] }} />);

    fireEvent.click(screen.getByRole('button', { name: /add education/i }));
    expect(screen.getByLabelText(/school name/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(screen.queryByLabelText(/school name/i)).not.toBeInTheDocument();
  });

  it('shows validation errors for missing required education fields', async () => {
    render(<EducationSection profile={{ education: [] }} />);

    fireEvent.click(screen.getByRole('button', { name: /add education/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/school name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/degree is required/i)).toBeInTheDocument();
    expect(screen.getByText(/field of study is required/i)).toBeInTheDocument();
    expect(screen.getByText(/start date is required/i)).toBeInTheDocument();
  });

  it('shows validation error when endDate is before startDate', async () => {
    render(<EducationSection profile={{ education: [] }} />);

    fireEvent.click(screen.getByRole('button', { name: /add education/i }));
    fireEvent.change(screen.getByLabelText(/school name/i), { target: { value: 'University of Oxford' } });
    fireEvent.change(screen.getByLabelText(/degree/i), { target: { value: 'Bachelor of Arts' } });
    fireEvent.change(screen.getByLabelText(/field of study/i), { target: { value: 'Mathematics' } });
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2021-06-30' } });
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2021-01-01' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/end date cannot be earlier than start date/i)).toBeInTheDocument();
  });

  it('saves education through the section API', async () => {
    const onSaved = vi.fn();
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        profile: {
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
    }));

    render(<EducationSection profile={{ education: [] }} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole('button', { name: /add education/i }));
    fireEvent.change(screen.getByLabelText(/school name/i), { target: { value: 'University of Oxford' } });
    fireEvent.change(screen.getByLabelText(/degree/i), { target: { value: 'Bachelor of Arts' } });
    fireEvent.change(screen.getByLabelText(/field of study/i), { target: { value: 'Mathematics' } });
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2018-09-01' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/profile/education'),
      expect.objectContaining({ method: 'PUT' })
    );
    expect(onSaved).toHaveBeenCalled();
  });
});
