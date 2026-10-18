import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ClientApplicationIntegrationErrorCode, UnprocessableEntityError } from '@fe/domain';
import { DashboardClientApplicationDetailPage } from '../DashboardClientApplicationDetailPage';
import '../../../i18n';

const getApp = { execute: vi.fn() };
const getIntegration = { execute: vi.fn() };
const updateIntegration = { execute: vi.fn() };

vi.mock('../../../app/container', () => ({
  AUTH_SESSION_EXPIRED_EVENT: 'auth:session-expired',
  tokenStorage: { getAccessToken: () => null },
  getClientApplicationUseCase: { execute: (id: string) => getApp.execute(id) },
  getClientApplicationIntegrationUseCase: { execute: (id: string) => getIntegration.execute(id) },
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
});
