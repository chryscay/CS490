import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import AppShell from '../components/AppShell';

describe('AppShell', () => {
  it('renders navigation links for Dashboard, Profile, and Settings', () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
  });

  it('marks the Dashboard link as active when on /dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppShell />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveClass('active');
  });

  it('does not mark Dashboard as active when on /profile', () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AppShell />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /dashboard/i })).not.toHaveClass('active');
    expect(screen.getByRole('link', { name: /profile/i })).toHaveClass('active');
  });

  it('adds collapsed class to sidebar when toggle is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /collapse sidebar/i }));

    expect(container.querySelector('.sidebar')).toHaveClass('sidebar--collapsed');
  });

  it('removes collapsed class when sidebar is expanded again', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /collapse sidebar/i }));
    await user.click(screen.getByRole('button', { name: /expand sidebar/i }));

    expect(container.querySelector('.sidebar')).not.toHaveClass('sidebar--collapsed');
  });
});
