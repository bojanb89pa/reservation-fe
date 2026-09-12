import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { User } from '@domain';
import { UserBadge } from '../UserBadge';
import '../../i18n';

const user: User = {
  id: 'u1',
  email: 'ana@example.com',
  firstName: 'Ana',
  lastName: 'Petrović',
  roles: [],
  enabled: true,
  profilePictureUrl: null,
};

describe('UserBadge', () => {
  it('shows the name when the user was resolved by the batch lookup', () => {
    render(<UserBadge userId="u1" user={user} />);
    expect(screen.getByText('Ana Petrović')).toBeInTheDocument();
  });

  it('falls back to an unknown-user label when the id was left out of the batch response', () => {
    render(<UserBadge userId="u2" user={undefined} />);
    expect(screen.getByText('Unknown user')).toBeInTheDocument();
  });
});
