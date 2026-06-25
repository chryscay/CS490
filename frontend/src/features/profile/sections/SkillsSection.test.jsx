import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import SkillsSection from './SkillsSection.jsx';

vi.mock('../../auth/useAuth.js', () => ({
  useAuth: () => ({
    currentUser: { getIdToken: vi.fn().mockResolvedValue('faketoken') },
  }),
}));

function mockFetch(impl) {
  vi.stubGlobal('fetch', vi.fn(impl));
}

describe('SkillsSection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders persisted skills values from profile', () => {
    render(
      <SkillsSection
        profile={{
          skills: [
            { id: 'skill-1', name: 'React', category: 'Frontend', proficiency: 'Advanced' },
          ],
        }}
      />
    );

    expect(screen.getByDisplayValue('React')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Frontend')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Advanced')).toBeInTheDocument();
  });

  it('allows adding and deleting a skill', async () => {
    mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ profile: { skills: [] } }) }));

    render(<SkillsSection profile={{ skills: [] }} />);

    fireEvent.click(screen.getByRole('button', { name: /add skill/i }));
    expect(screen.getByLabelText(/skill name/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(screen.queryByLabelText(/skill name/i)).not.toBeInTheDocument();
  });

  it('shows validation when name is missing', async () => {
    render(<SkillsSection profile={{ skills: [] }} />);

    fireEvent.click(screen.getByRole('button', { name: /add skill/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/skill name is required/i)).toBeInTheDocument();
  });

  it('shows duplicate validation and prevents save for duplicate skills', async () => {
    const onSaved = vi.fn();
    mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ profile: { skills: [] } }) }));

    render(<SkillsSection profile={{ skills: [] }} onSaved={onSaved} />);

    fireEvent.click(screen.getByRole('button', { name: /add skill/i }));
    fireEvent.click(screen.getByRole('button', { name: /add skill/i }));

    const nameInputs = screen.getAllByLabelText(/skill name/i);
    fireEvent.change(nameInputs[0], { target: { value: 'React' } });
    fireEvent.change(nameInputs[1], { target: { value: 'react ' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/duplicate skill/i)).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('allows skills to be reordered and preserves the new order on save', async () => {
    let requestBody;
    const onSaved = vi.fn();

    mockFetch(async (_url, init) => {
      requestBody = JSON.parse(init.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          profile: {
            skills: [
              { id: 'skill-2', name: 'CSS', category: 'Frontend', proficiency: 'Intermediate' },
              { id: 'skill-1', name: 'React', category: 'Frontend', proficiency: 'Advanced' },
            ],
          },
        }),
      };
    });

    render(
      <SkillsSection
        profile={{
          skills: [
            { id: 'skill-1', name: 'React', category: 'Frontend', proficiency: 'Advanced' },
            { id: 'skill-2', name: 'CSS', category: 'Frontend', proficiency: 'Intermediate' },
          ],
        }}
        onSaved={onSaved}
      />
    );

    const moveUpButtons = screen.getAllByRole('button', { name: /move up/i });
    expect(moveUpButtons[0]).toBeDisabled();
    expect(moveUpButtons[1]).toBeEnabled();

    fireEvent.click(moveUpButtons[1]);

    const nameInputs = screen.getAllByLabelText(/skill name/i);
    expect(nameInputs[0]).toHaveValue('CSS');
    expect(nameInputs[1]).toHaveValue('React');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument());

    expect(requestBody.skills[0].id).toBe('skill-2');
    expect(requestBody.skills[1].id).toBe('skill-1');
    expect(onSaved).toHaveBeenCalled();
  });

  it('saves through /api/profile/skills', async () => {
    const onSaved = vi.fn();
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        profile: {
          skills: [
            { id: 'skill-1', name: 'React', category: 'Frontend', proficiency: 'Advanced' },
          ],
        },
      }),
    }));

    render(<SkillsSection profile={{ skills: [] }} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole('button', { name: /add skill/i }));
    fireEvent.change(screen.getByLabelText(/skill name/i), { target: { value: 'React' } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'Frontend' } });
    fireEvent.change(screen.getByLabelText(/proficiency/i), { target: { value: 'Advanced' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/profile/skills'),
      expect.objectContaining({ method: 'PUT' })
    );
    expect(onSaved).toHaveBeenCalled();
  });
});
