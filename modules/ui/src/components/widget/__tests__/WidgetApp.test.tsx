import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WIDGET_PROTOCOL_VERSION, WidgetMessageType } from '@fe/domain';
import type { WidgetConfig } from '@fe/domain';
import '../../../i18n';

const PARTNER = 'https://partner.test';

const mocks = vi.hoisted(() => ({
  getWidgetConfig: vi.fn(),
  exchange: vi.fn(),
  createReservation: vi.fn(),
  slots: [] as unknown[],
}));

// A slot later today, so the calendar's current month has a selectable day.
const TODAY = new Date();
const TODAY_ISO = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}-${String(TODAY.getDate()).padStart(2, '0')}`;
mocks.slots = [
  { startTime: `${TODAY_ISO}T23:00:00`, endTime: `${TODAY_ISO}T23:59:00`, status: 'AVAILABLE' },
];

vi.mock('../../../app/container', () => ({
  env: { appSiteUrl: 'http://reserva.test/' },
  getWidgetConfigUseCase: { execute: mocks.getWidgetConfig },
  exchangeIdentityTokenUseCase: { execute: mocks.exchange },
  createClientApplicationReservationUseCase: { execute: mocks.createReservation },
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
  getResourceSlotsUseCase: { execute: () => Promise.resolve(mocks.slots) },
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

  /** Answers the widget's `need-identity` the way the loader would, with the current `token`. */
  function connectLoader() {
    const loader = { token: null as string | null };
    const postMessage = vi
      .spyOn(window.parent, 'postMessage')
      .mockImplementation((message: unknown) => {
        if ((message as { type?: string }).type === WidgetMessageType.NEED_IDENTITY) {
          setTimeout(() => act(() => identity(loader.token)), 0);
        }
      });
    return { loader, postMessage };
  }

  async function pickSlot() {
    await userEvent.click(await screen.findByRole('tab', { name: /Room 1/ }));
    await userEvent.click(await screen.findByRole('button', { name: String(TODAY.getDate()) }));
    await userEvent.click(await screen.findByRole('button', { name: '23:00' }));
  }

  it('shows the watermark link in every state', async () => {
    mocks.getWidgetConfig.mockResolvedValue(config({ enabled: false }));
    vi.spyOn(window.parent, 'postMessage').mockImplementation(() => undefined);
    render(<WidgetApp />);

    expect(screen.getByTestId('widget-watermark')).toHaveAttribute('href', 'http://reserva.test/');
    await screen.findByTestId('widget-alert');
    expect(screen.getByTestId('widget-watermark')).toHaveAttribute('target', '_blank');
  });

  it('lets a guest pick a slot and shows the confirm button', async () => {
    mocks.getWidgetConfig.mockResolvedValue(config());
    connectLoader();
    render(<WidgetApp />);

    await pickSlot();

    expect(await screen.findByRole('button', { name: 'Confirm reservation' })).toBeEnabled();
    expect(screen.queryByTestId('booking-confirm-notice')).toBeNull();
  });

  it('remembers the guest choice, asks for sign-in and completes after identity', async () => {
    mocks.getWidgetConfig.mockResolvedValue(config());
    mocks.exchange.mockResolvedValue({ accessToken: 'partner-token', expiresIn: 600 });
    mocks.createReservation.mockResolvedValue({
      id: 'r-1',
      status: 'PENDING_APPROVAL',
      startTime: `${TODAY_ISO}T23:00:00`,
      endTime: `${TODAY_ISO}T23:59:00`,
    });
    const { loader, postMessage } = connectLoader();
    render(<WidgetApp />);

    await pickSlot();
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm reservation' }));

    expect(await screen.findByTestId('widget-sign-in-pending')).toHaveTextContent(
      'Sign in to confirm your reservation',
    );
    expect(postMessage).toHaveBeenCalledWith(
      { v: WIDGET_PROTOCOL_VERSION, type: WidgetMessageType.SIGN_IN_REQUIRED },
      PARTNER,
    );
    expect(mocks.createReservation).not.toHaveBeenCalled();

    loader.token = 'id-token';
    act(() => identity('id-token'));

    expect(await screen.findByTestId('widget-reservation-created')).toBeInTheDocument();
    expect(mocks.createReservation).toHaveBeenCalledWith(
      'partner-token',
      expect.objectContaining({
        resourceId: 'res-1',
        serviceId: 'svc-1',
        startTime: `${TODAY_ISO}T23:00:00`,
      }),
    );
  });

  it('returns to the booking form when the guest cancels', async () => {
    mocks.getWidgetConfig.mockResolvedValue(config());
    connectLoader();
    render(<WidgetApp />);

    await pickSlot();
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm reservation' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(screen.queryByTestId('widget-sign-in-pending')).toBeNull();
    expect(await screen.findByRole('tab', { name: /Room 1/ })).toBeInTheDocument();
  });

  it('shows the confirm button for a signed-in user', async () => {
    mocks.getWidgetConfig.mockResolvedValue(config());
    const { loader } = connectLoader();
    loader.token = 'id-token';
    render(<WidgetApp />);

    await userEvent.click(await screen.findByRole('tab', { name: /Room 1/ }));
    act(() => identity('id-token'));

    expect(await screen.findByRole('button', { name: 'Confirm reservation' })).toBeInTheDocument();
    expect(screen.queryByTestId('booking-confirm-notice')).toBeNull();
  });
});
