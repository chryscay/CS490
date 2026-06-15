import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AppShell from '../components/AppShell';

vi.mock('../features/auth/useAuth.js', () => ({
  useAuth: () => ({
    logout: vi.fn(),
  }),
}));

describe('AppShell', () => {
  it('renders Dashboard, Profile, and Settings navigation links', () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('link', { name: /dashboard/i })
    ).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
  });

  it('renders logout button', () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('marks dashboard link active on /dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppShell />
      </MemoryRouter>
    );

    const dashboardLink = screen.getByRole('link', {
      name: /dashboard/i,
    });

    expect(dashboardLink.className).toContain('bg-white/10');
  });

  it('marks profile link active on /profile', () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AppShell />
      </MemoryRouter>
    );

    const profileLink = screen.getByRole('link', {
      name: /profile/i,
    });

    expect(profileLink.className).toContain('bg-white/10');
  });

  it('shows mobile menu toggle button', () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('button', { name: /toggle menu/i })
    ).toBeInTheDocument();
  });

  it('toggles mobile menu when clicked', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    );

    const toggleButton = screen.getByRole('button', {
      name: /toggle menu/i,
    });

    await user.click(toggleButton);

    expect(screen.getByRole('link', { name: /dashboard/i })).toBeVisible();
  });
});
