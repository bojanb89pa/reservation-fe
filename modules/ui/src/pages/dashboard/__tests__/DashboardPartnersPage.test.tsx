import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { OwnerClientApplicationConsent } from '@fe/domain';
import { DashboardPartnersPage } from '../DashboardPartnersPage';
import '../../../i18n';

const listMine = { execute: vi.fn() };
const approve = { execute: vi.fn() };
const revoke = { execute: vi.fn() };
const getPublic = { execute: vi.fn() };

vi.mock('../../../app/container', () => ({
  AUTH_SESSION_EXPIRED_EVENT: 'auth:session-expired',
  tokenStorage: { getAccessToken: () => null },
  listMyClientApplicationConsentsUseCase: { execute: () => listMine.execute() },
  approveClientApplicationConsentUseCase: { execute: (id: string) => approve.execute(id) },
  revokeClientApplicationConsentUseCase: { execute: (id: string) => revoke.execute(id) },
  getPublicClientApplicationIntegrationUseCase: {
    execute: (id: string) => getPublic.execute(id),
  },
}));

function consent(
  id: string,
  status: OwnerClientApplicationConsent['status'],
  appId: string,
  appName: string,
): OwnerClientApplicationConsent {
  return {
    id,
    status,
    decidedByUserId: null,
    decidedAt: null,
    createdAt: '2026-10-01T10:00:00Z',
    clientApplication: {
      id: appId,
      name: appName,
      enabled: true,
      scope: { type: 'LOCATION_LIST', locationIds: ['loc-1'] },
    },
    location: {
      id: 'loc-1',
      businessId: 'biz-1',
      name: 'Main branch',
      addressLine1: 'Main 1',
      city: 'Belgrade',
    },
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardPartnersPage />
    </QueryClientProvider>,
  );
}

describe('DashboardPartnersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMine.execute.mockResolvedValue([
      consent('c1', 'PENDING', 'app-1', 'Acme Widget'),
      consent('c2', 'APPROVED', 'app-2', 'Beta Booking'),
      consent('c3', 'REVOKED', 'app-3', 'Gamma Plan'),
    ]);
    getPublic.execute.mockImplementation(async (id: string) =>
      id === 'app-3'
        ? null
        : {
            clientApplicationId: id,
            allowedOrigins: [`https://${id}.example.com`],
            allowedScopes: ['reservation:create'],
          },
    );
    approve.execute.mockResolvedValue({});
    revoke.execute.mockResolvedValue({});
  });

  it('groups consents by location and shows who the partner is and what it may do', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Main branch' })).toBeInTheDocument();
    const cards = await screen.findAllByTestId('partner-consent-card');
    expect(cards).toHaveLength(3);

    const acme = cards[0];
    expect(within(acme).getByText('Acme Widget')).toBeInTheDocument();
    await waitFor(() =>
      expect(within(acme).getByText('https://app-1.example.com')).toBeInTheDocument(),
    );
    expect(within(acme).getByText(/Create reservations/)).toBeInTheDocument();
    expect(within(acme).getByRole('button', { name: 'Approve' })).toBeInTheDocument();

    expect(within(cards[1]).getByRole('button', { name: 'Revoke' })).toBeInTheDocument();

    await waitFor(() =>
      expect(
        within(cards[2]).getByText('This partner has not set up its integration yet.'),
      ).toBeInTheDocument(),
    );
    expect(within(cards[2]).getByRole('button', { name: 'Approve' })).toBeInTheDocument();
  });

  it('approves a pending consent and revokes an approved one', async () => {
    renderPage();
    const cards = await screen.findAllByTestId('partner-consent-card');

    fireEvent.click(within(cards[0]).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(approve.execute).toHaveBeenCalledWith('c1'));

    fireEvent.click(within(cards[1]).getByRole('button', { name: 'Revoke' }));
    await waitFor(() => expect(revoke.execute).toHaveBeenCalledWith('c2'));

    await waitFor(() => expect(listMine.execute.mock.calls.length).toBeGreaterThan(1));
  });

  it('shows an empty state when there are no requests', async () => {
    listMine.execute.mockResolvedValue([]);
    renderPage();
    expect(
      await screen.findByText('No partner has asked for access to your locations yet.'),
    ).toBeInTheDocument();
  });
});
