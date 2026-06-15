import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AppShell from '../components/AppShell';

vi.mock('../features/auth/useAuth.js', () => ({
  useAuth: () => ({
    logout: vi.fn(),
  }),
}));

describe('AppShell', () => {
  it('renders navigation links for Dashboard, Profile, and Settings', () => {
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

  it('marks Dashboard link as active when on /dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppShell />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('marks Profile link as active when on /profile', () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AppShell />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /profile/i })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('renders Logout button', () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('renders application branding', () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/claude scholars/i)[0]).toBeInTheDocument();
  });
});
