import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardLayout } from '../DashboardLayout';
import '../../../i18n';

const mockUseIsAdmin = vi.fn();

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ logout: vi.fn() }),
  useIsAdmin: () => mockUseIsAdmin(),
}));

vi.mock('../../../hooks/useBusinesses', () => ({
  useMyBusinesses: () => ({
    data: { content: [{ id: 'b1', status: 'ACTIVE' }] },
    isLoading: false,
  }),
}));

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <DashboardLayout />
    </MemoryRouter>,
  );
}

describe('DashboardLayout mobile navigation', () => {
  beforeEach(() => {
    mockUseIsAdmin.mockReset();
  });

  it('exposes the users link in the mobile navigation for admins', () => {
    mockUseIsAdmin.mockReturnValue(true);
    renderLayout();
    const nav = screen.getByRole('navigation', { name: /navigation|navigacija/i });
    expect(within(nav).getByRole('link', { name: /users|korisnici/i })).toHaveAttribute(
      'href',
      '/dashboard/users',
    );
  });

  it('does not expose the users link to non-admins', () => {
    mockUseIsAdmin.mockReturnValue(false);
    renderLayout();
    expect(screen.queryByRole('link', { name: /users|korisnici/i })).toBeNull();
  });
});
