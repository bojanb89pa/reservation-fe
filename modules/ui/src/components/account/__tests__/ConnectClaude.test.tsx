import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../../../i18n';

const list = vi.fn();
const revoke = vi.fn();
vi.mock('../../../app/container', () => ({
  env: { mcpConnectorUrl: 'https://reserva.example/api/mcp' },
  listMyMcpClientConsentsUseCase: { execute: () => list() },
  revokeMcpClientConsentUseCase: { execute: (id: string) => revoke(id) },
}));

import { ConnectClaudeInstructions } from '../ConnectClaudeInstructions';
import { ConnectedAiApps } from '../ConnectedAiApps';

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const consent = {
  clientId: 'https://claude.ai/meta.json',
  clientName: '<b>Claude</b>',
  clientHost: 'claude.ai',
  scopes: ['reservation:create'],
  grantedAt: '2026-01-05T10:00:00Z',
};

describe('ConnectClaudeInstructions', () => {
  it('shows connector URL and copies it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    wrap(<ConnectClaudeInstructions />);
    expect(screen.getByLabelText(/connector url|url konektora/i)).toHaveValue(
      'https://reserva.example/api/mcp',
    );
    fireEvent.click(screen.getByRole('button', { name: /copy url|kopiraj url/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://reserva.example/api/mcp'));
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });
});

describe('ConnectedAiApps', () => {
  beforeEach(() => {
    list.mockReset();
    revoke.mockReset();
  });

  it('renders consents as plain text and revokes after confirmation', async () => {
    list.mockResolvedValueOnce([consent]).mockResolvedValue([]);
    revoke.mockResolvedValue(undefined);
    wrap(<ConnectedAiApps />);

    const item = await screen.findByTestId('connected-ai-app-item');
    expect(within(item).getByText('<b>Claude</b>')).toBeInTheDocument();
    expect(within(item).getByText(/claude\.ai/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ukloni pristup za|remove access for/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /ukloni pristup|remove access/i }));

    await waitFor(() => expect(revoke).toHaveBeenCalledWith(consent.clientId));
    await waitFor(() => expect(screen.queryByTestId('connected-ai-app-item')).toBeNull());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows empty state', async () => {
    list.mockResolvedValue([]);
    wrap(<ConnectedAiApps />);
    expect(await screen.findByText(/nijedna ai aplikacija|no ai apps/i)).toBeInTheDocument();
  });
});
