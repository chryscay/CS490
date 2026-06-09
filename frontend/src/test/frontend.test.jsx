import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('frontend test setup', () => {
  it('renders a sample React element', () => {
    render(<h1>Frontend test setup ready</h1>);

    expect(
      screen.getByRole('heading', { name: /frontend test setup ready/i })
    ).toBeInTheDocument();
  });
});