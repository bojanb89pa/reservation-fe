import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WIDGET_PROTOCOL_VERSION, WidgetMessageType } from '@fe/domain';
import type { WidgetConfig } from '@fe/domain';
import '../../../i18n';

const PARTNER = 'https://partner.test';

const mocks = vi.hoisted(() => ({
  getWidgetConfig: vi.fn(),
}));

vi.mock('../../../app/container', () => ({
  getWidgetConfigUseCase: { execute: mocks.getWidgetConfig },
  exchangeIdentityTokenUseCase: { execute: vi.fn() },
  createClientApplicationReservationUseCase: { execute: vi.fn() },
  // Plain functions (not vi.fn) so `vi.restoreAllMocks()` cannot reset them.
  getAllResourcesUseCase: {
    execute: () =>
      Promise.resolve({
        content: [{ id: 'res-1', businessId: 'b-1', type: 'ROOM', name: 'Room 1' }],
      }),
  },
  listBusinessServicesUseCase: {
    execute: () =>
      Promise.resolve([
        {
          id: 'svc-1',
          name: 'Massage',
          minDuration: 60,
          maxDuration: 60,
          durationUnit: 'MINUTES',
          durationStep: 15,
          fixedDuration: true,
        },
      ]),
  },
  getResourceSlotsUseCase: { execute: () => Promise.resolve([]) },
  getAvailabilityBlocksUseCase: { execute: () => Promise.resolve([]) },
}));

import { WidgetApp } from '../WidgetApp';

function config(overrides: Partial<WidgetConfig> = {}): WidgetConfig {
  return {
    clientApplicationId: 'client-1',
    allowedOrigins: [PARTNER],
    enabled: true,
    locations: [
      { locationId: 'loc-1', locationName: 'Studio', businessId: 'b-1', businessName: 'Biz' },
    ],
    ...overrides,
  };
}

function identity(idToken: string | null) {
  window.dispatchEvent(
    new MessageEvent('message', {
      origin: PARTNER,
      source: window.parent,
      data: { v: WIDGET_PROTOCOL_VERSION, type: WidgetMessageType.IDENTITY, idToken },
    }),
  );
}

let clientSeq = 0;

describe('WidgetApp', () => {
  beforeEach(() => {
    window.history.replaceState(
      null,
      '',
      // A distinct clientId per test: the app's QueryClient is a module singleton and would
      // otherwise serve the previous test's cached widget-config.
      `/widget/?clientId=client-${++clientSeq}&locationId=loc-1&locale=en&origin=${encodeURIComponent(PARTNER)}`,
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    mocks.getWidgetConfig.mockReset();
  });

  it('tells the loader the partner is disabled and shows no booking UI', async () => {
    mocks.getWidgetConfig.mockResolvedValue(config({ enabled: false }));
    const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => undefined);
    render(<WidgetApp />);

    expect(await screen.findByTestId('widget-alert')).toHaveTextContent(
      'Booking through this website is currently switched off.',
    );
    expect(postMessage).toHaveBeenCalledWith(
      {
        v: WIDGET_PROTOCOL_VERSION,
        type: WidgetMessageType.UNAVAILABLE,
        reason: 'PARTNER_DISABLED',
      },
      PARTNER,
    );
  });

  it('reports a location outside the partner scope', async () => {
    mocks.getWidgetConfig.mockResolvedValue(config({ locations: [] }));
    const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => undefined);
    render(<WidgetApp />);

    await screen.findByTestId('widget-alert');
    expect(postMessage).toHaveBeenCalledWith(
      {
        v: WIDGET_PROTOCOL_VERSION,
        type: WidgetMessageType.UNAVAILABLE,
        reason: 'LOCATION_OUT_OF_SCOPE',
      },
      PARTNER,
    );
  });

  it('refuses to talk to an embedding origin outside allowedOrigins', async () => {
    mocks.getWidgetConfig.mockResolvedValue(config({ allowedOrigins: ['https://other.test'] }));
    const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => undefined);
    render(<WidgetApp />);

    expect(await screen.findByTestId('widget-alert')).toHaveTextContent(
      'This website is not allowed to show the booking widget.',
    );
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('shows the sign-in notice instead of the confirm button for a guest', async () => {
    mocks.getWidgetConfig.mockResolvedValue(config());
    vi.spyOn(window.parent, 'postMessage').mockImplementation(() => undefined);
    render(<WidgetApp />);

    await userEvent.click(await screen.findByRole('tab', { name: /Room 1/ }));
    act(() => identity(null));

    expect(await screen.findByTestId('booking-confirm-notice')).toHaveTextContent(
      'Sign in on the partner website to book a slot.',
    );
    expect(screen.queryByRole('button', { name: 'Confirm reservation' })).toBeNull();
  });

  it('shows the confirm button for a signed-in user', async () => {
    mocks.getWidgetConfig.mockResolvedValue(config());
    vi.spyOn(window.parent, 'postMessage').mockImplementation(() => undefined);
    render(<WidgetApp />);

    await userEvent.click(await screen.findByRole('tab', { name: /Room 1/ }));
    act(() => identity('id-token'));

    expect(await screen.findByRole('button', { name: 'Confirm reservation' })).toBeInTheDocument();
    expect(screen.queryByTestId('booking-confirm-notice')).toBeNull();
  });
});
