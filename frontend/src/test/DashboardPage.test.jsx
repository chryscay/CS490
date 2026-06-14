import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DashboardPage from '../pages/DashboardPage';

describe('DashboardPage', () => {
  it('renders the Dashboard heading', () => {
    render(<DashboardPage />);
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
  });

  it('renders the job board section', () => {
    render(<DashboardPage />);
    expect(screen.getByRole('region', { name: /job board/i })).toBeInTheDocument();
  });

  it('shows empty state when there are no jobs', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/no jobs yet/i)).toBeInTheDocument();
  });

  it('renders an Add Job button', () => {
    render(<DashboardPage />);
    expect(screen.getByRole('button', { name: /add job/i })).toBeInTheDocument();
  });

  it('renders all four stat cards', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Total Jobs')).toBeInTheDocument();
    expect(screen.getByText('Applications')).toBeInTheDocument();
    expect(screen.getByText('Interviews')).toBeInTheDocument();
    expect(screen.getByText('Hired')).toBeInTheDocument();
  });
});
