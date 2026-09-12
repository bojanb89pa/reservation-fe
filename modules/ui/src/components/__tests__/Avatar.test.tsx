import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from '../Avatar';
import '../../i18n';

describe('Avatar', () => {
  it('renders the picture when one is set', () => {
    render(<Avatar firstName="Ana" lastName="Petrović" profilePictureUrl="/auth/users/1/profile-picture" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/auth/users/1/profile-picture');
  });

  it('falls back to initials when there is no picture — a normal state, not an error', () => {
    const { container } = render(<Avatar firstName="Ana" lastName="Petrović" profilePictureUrl={null} />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('AP')).toBeInTheDocument();
  });

  it('falls back to a generic mark when even the name is unknown', () => {
    render(<Avatar profilePictureUrl={null} />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('applies the requested diameter', () => {
    const { container } = render(<Avatar firstName="Ana" lastName="Petrović" profilePictureUrl={null} size={96} />);
    expect((container.firstChild as HTMLElement).style.width).toBe('96px');
  });
});
