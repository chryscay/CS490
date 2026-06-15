import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProfileCompletion from './ProfileCompletion.jsx';

describe('ProfileCompletion', () => {
  it('counts only the filled baseline fields', () => {
    render(<ProfileCompletion profile={{ fullName: 'Ada', phone: '', location: '', summary: 'Math' }} />);
    expect(screen.getByText('2 of 4 fields complete')).toBeInTheDocument();
  });

  it('shows all four when every baseline field is filled', () => {
    render(<ProfileCompletion profile={{ fullName: 'Ada', phone: '555', location: 'London', summary: 'Math' }} />);
    expect(screen.getByText('4 of 4 fields complete')).toBeInTheDocument();
  });

  it('shows zero for an empty profile', () => {
    render(<ProfileCompletion profile={{ fullName: '', phone: '', location: '', summary: '' }} />);
    expect(screen.getByText('0 of 4 fields complete')).toBeInTheDocument();
  });

  it('treats whitespace-only fields as empty', () => {
    render(<ProfileCompletion profile={{ fullName: '   ', phone: '', location: '', summary: 'Math' }} />);
    expect(screen.getByText('1 of 4 fields complete')).toBeInTheDocument();
  });

  it('updates the count when the profile changes', () => {
    const { rerender } = render(
      <ProfileCompletion profile={{ fullName: 'Ada', phone: '', location: '', summary: '' }} />
    );
    expect(screen.getByText('1 of 4 fields complete')).toBeInTheDocument();
    rerender(<ProfileCompletion profile={{ fullName: 'Ada', phone: '', location: '', summary: 'Math' }} />);
    expect(screen.getByText('2 of 4 fields complete')).toBeInTheDocument();
  });
});