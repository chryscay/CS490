import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProfileCompletion from './ProfileCompletion.jsx';

describe('ProfileCompletion', () => {
  it('counts only the filled required fields', () => {
    render(
      <ProfileCompletion
        profile={{
          firstName: 'Ada',
          lastName: '',
          phone: '',
          city: '',
          state: '',
          summary: '',
        }}
      />
    );

    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('shows all required fields when filled', () => {
    render(
      <ProfileCompletion
        profile={{
          firstName: 'Ada',
          lastName: 'Lovelace',
          phone: '',
          city: '',
          state: '',
          summary: 'Math',
        }}
      />
    );

    expect(screen.getByText('3/3')).toBeInTheDocument();
  });

  it('ignores optional fields (phone, city, state)', () => {
    render(
      <ProfileCompletion
        profile={{
          firstName: '',
          lastName: '',
          phone: '5551234567',
          city: 'London',
          state: 'CA',
          summary: '',
        }}
      />
    );

    expect(screen.getByText('0/3')).toBeInTheDocument();
  });

  it('shows zero for an empty profile', () => {
    render(
      <ProfileCompletion
        profile={{
          firstName: '',
          lastName: '',
          phone: '',
          city: '',
          state: '',
          summary: '',
        }}
      />
    );

    expect(screen.getByText('0/3')).toBeInTheDocument();
  });

  it('treats whitespace-only fields as empty', () => {
    render(
      <ProfileCompletion
        profile={{
          firstName: '   ',
          lastName: '',
          phone: '',
          city: '',
          state: '',
          summary: 'Math',
        }}
      />
    );

    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('updates the count when the profile changes', () => {
    const { rerender } = render(
      <ProfileCompletion
        profile={{
          firstName: 'Ada',
          lastName: '',
          phone: '',
          city: '',
          state: '',
          summary: '',
        }}
      />
    );

    expect(screen.getByText('1/3')).toBeInTheDocument();

    rerender(
      <ProfileCompletion
        profile={{
          firstName: 'Ada',
          lastName: 'Lovelace',
          phone: '',
          city: '',
          state: '',
          summary: 'Math',
        }}
      />
    );

    expect(screen.getByText('3/3')).toBeInTheDocument();
  });
});
