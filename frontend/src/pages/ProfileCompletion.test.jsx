import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProfileCompletion from './ProfileCompletion.jsx';

describe('ProfileCompletion', () => {
  it('counts only the filled required fields', () => {
    render(
      <ProfileCompletion
        profile={{
          fullName: 'Ada',
          phone: '',
          location: '',
          summary: '',
        }}
      />
    );

    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('shows both when the required fields are filled', () => {
    render(
      <ProfileCompletion
        profile={{
          fullName: 'Ada',
          phone: '',
          location: '',
          summary: 'Math',
        }}
      />
    );

    expect(screen.getByText('2/2')).toBeInTheDocument();
  });

  it('ignores optional fields (phone, location)', () => {
    render(
      <ProfileCompletion
        profile={{
          fullName: '',
          phone: '555',
          location: 'London',
          summary: '',
        }}
      />
    );

    expect(screen.getByText('0/2')).toBeInTheDocument();
  });

  it('shows zero for an empty profile', () => {
    render(
      <ProfileCompletion
        profile={{
          fullName: '',
          phone: '',
          location: '',
          summary: '',
        }}
      />
    );

    expect(screen.getByText('0/2')).toBeInTheDocument();
  });

  it('treats whitespace-only fields as empty', () => {
    render(
      <ProfileCompletion
        profile={{
          fullName: '   ',
          phone: '',
          location: '',
          summary: 'Math',
        }}
      />
    );

    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('updates the count when the profile changes', () => {
    const { rerender } = render(
      <ProfileCompletion
        profile={{
          fullName: 'Ada',
          phone: '',
          location: '',
          summary: '',
        }}
      />
    );

    expect(screen.getByText('1/2')).toBeInTheDocument();

    rerender(
      <ProfileCompletion
        profile={{
          fullName: 'Ada',
          phone: '',
          location: '',
          summary: 'Math',
        }}
      />
    );

    expect(screen.getByText('2/2')).toBeInTheDocument();
  });
});
