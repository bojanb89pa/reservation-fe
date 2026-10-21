import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  ClientApplicationIntegrationErrorCode,
  NotFoundError,
  UnprocessableEntityError,
  ValidationError,
} from '@fe/domain';
import { DashboardClientApplicationDetailPage } from '../DashboardClientApplicationDetailPage';
import '../../../i18n';

const getApp = { execute: vi.fn() };
const getIntegration = { execute: vi.fn() };
const updateIntegration = { execute: vi.fn() };
const setEnabled = { execute: vi.fn() };

vi.mock('../../../app/container', () => ({
  AUTH_SESSION_EXPIRED_EVENT: 'auth:session-expired',
  tokenStorage: { getAccessToken: () => null },
  getClientApplicationUseCase: { execute: (id: string) => getApp.execute(id) },
  getClientApplicationIntegrationUseCase: { execute: (id: string) => getIntegration.execute(id) },
  setClientApplicationEnabledUseCase: { execute: (cmd: unknown) => setEnabled.execute(cmd) },
  updateClientApplicationIntegrationUseCase: {
    execute: (cmd: unknown) => updateIntegration.execute(cmd),
  },
}));

const integration = {
  clientApplicationId: 'app-1',
  trustedIssuers: [],
  allowedOrigins: ['https://partner.com'],
  allowedScopes: [],
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard/client-applications/app-1']}>
        <Routes>
          <Route
            path="/dashboard/client-applications/:id"
            element={<DashboardClientApplicationDetailPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DashboardClientApplicationDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApp.execute.mockResolvedValue({
      id: 'app-1',
      name: 'Acme Widget',
      enabled: true,
      scope: { type: 'LOCATION_LIST', locationIds: ['loc-1', 'loc-2'] },
      consents: [
        {
          id: 'c1',
          clientApplicationId: 'app-1',
          locationId: 'loc-1',
          status: 'APPROVED',
          decidedByUserId: 'u1',
          decidedAt: '2026-10-02T10:00:00Z',
          createdAt: '2026-10-01T10:00:00Z',
        },
      ],
    });
    getIntegration.execute.mockResolvedValue(integration);
  });

  it('shows the LOCATION_LIST scope and consent statuses per location', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Acme Widget' })).toBeInTheDocument();
    expect(screen.getByText(/loc-1, loc-2/)).toBeInTheDocument();
    const row = await screen.findByTestId('client-application-consent-row');
    expect(row).toHaveTextContent('loc-1');
    expect(row).toHaveTextContent('Approved');
  });

  it('disables the partner after confirmation and reflects the response', async () => {
    setEnabled.execute.mockResolvedValue({
      id: 'app-1',
      name: 'Acme Widget',
      enabled: false,
      scope: { type: 'LOCATION_LIST', locationIds: ['loc-1', 'loc-2'] },
    });
    renderPage();

    const toggle = await screen.findByRole('switch', { name: 'Partner Acme Widget enabled' });
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(/invalid_client/);
    expect(dialog).toHaveTextContent(/reservations and consents stay untouched/i);
    expect(setEnabled.execute).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Disable partner' }));

    await waitFor(() =>
      expect(setEnabled.execute).toHaveBeenCalledWith({
        clientApplicationId: 'app-1',
        enabled: false,
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('switch', { name: 'Partner Acme Widget enabled' })).not.toBeChecked();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('does nothing when the confirmation is cancelled', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('switch', { name: 'Partner Acme Widget enabled' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(setEnabled.execute).not.toHaveBeenCalled();
  });

  it('shows a not-found message when the switch fails with 404', async () => {
    setEnabled.execute.mockRejectedValue(new NotFoundError('gone'));
    renderPage();
    fireEvent.click(await screen.findByRole('switch', { name: 'Partner Acme Widget enabled' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Disable partner' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This partner no longer exists.');
  });

  it('saves the integration and translates a 422 key', async () => {
    updateIntegration.execute.mockRejectedValue(
      new UnprocessableEntityError(ClientApplicationIntegrationErrorCode.ORIGIN_INVALID),
    );
    renderPage();

    const origins = await screen.findByLabelText('Allowed origins (one per line)');
    fireEvent.change(origins, { target: { value: 'https://partner.com/path' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save integration' }));

    await waitFor(() =>
      expect(updateIntegration.execute).toHaveBeenCalledWith({
        clientApplicationId: 'app-1',
        trustedIssuers: [],
        allowedOrigins: ['https://partner.com/path'],
        allowedScopes: [],
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(/allowed origin is invalid/i);
  });

  it('translates the 400 partner_key_invalid key', async () => {
    updateIntegration.execute.mockRejectedValue(
      new ValidationError(ClientApplicationIntegrationErrorCode.PARTNER_KEY_INVALID),
    );
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Save integration' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/partner key is invalid/i);
  });
});
