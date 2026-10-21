import { describe, it, expect, vi } from 'vitest';
import { NotFoundError, TokenExchangeError, TokenExchangeErrorCode, UnprocessableEntityError } from '@fe/domain';
import type {
  ClientApplicationIntegrationRepository,
  ClientApplicationReservation,
  ClientApplicationWidgetConfig,
  ClientApplicationWidgetRepository,
  CreateClientApplicationReservationCommand,
  ExchangeIdentityTokenCommand,
  PublicClientApplicationIntegration,
  TokenExchangeRepository,
  TokenExchangeResult,
  WidgetConfig,
} from '@fe/domain';
import { GetWidgetConfigUseCaseImpl } from '../widget/GetWidgetConfigUseCaseImpl';
import { ExchangeIdentityTokenUseCaseImpl } from '../widget/ExchangeIdentityTokenUseCaseImpl';
import { CreateClientApplicationReservationUseCaseImpl } from '../widget/CreateClientApplicationReservationUseCaseImpl';
import {
  mapReservationErrorToUnavailableReason,
  resolveWidgetAvailability,
} from '../widget/resolveWidgetAvailability';
import { isAllowedMessageOrigin } from '../widget/isAllowedMessageOrigin';

const location = { locationId: 'loc-1', locationName: 'Main', businessId: 'b-1', businessName: 'Biz' };
const widgetConfig: ClientApplicationWidgetConfig = {
  clientApplicationId: 'app-1',
  enabled: true,
  locations: [location],
};

function widgetRepo(): ClientApplicationWidgetRepository {
  return { getWidgetConfig: vi.fn(), createReservation: vi.fn() };
}
function integrationRepo(): ClientApplicationIntegrationRepository {
  return { getIntegration: vi.fn(), updateIntegration: vi.fn(), getPublicIntegration: vi.fn() };
}

describe('GetWidgetConfigUseCaseImpl', () => {
  it('merges widget config with allowed origins', async () => {
    const w = widgetRepo();
    const i = integrationRepo();
    w.getWidgetConfig = vi.fn().mockResolvedValue(widgetConfig);
    i.getPublicIntegration = vi.fn().mockResolvedValue({
      clientApplicationId: 'app-1',
      allowedOrigins: ['https://partner.rs'],
      allowedScopes: [],
    } satisfies PublicClientApplicationIntegration);

    const result = await new GetWidgetConfigUseCaseImpl(w, i).execute('app-1');

    expect(w.getWidgetConfig).toHaveBeenCalledWith('app-1');
    expect(i.getPublicIntegration).toHaveBeenCalledWith('app-1');
    expect(result).toEqual({
      clientApplicationId: 'app-1',
      allowedOrigins: ['https://partner.rs'],
      enabled: true,
      locations: [location],
    });
  });

  it('returns empty allowedOrigins when there is no integration', async () => {
    const w = widgetRepo();
    const i = integrationRepo();
    w.getWidgetConfig = vi.fn().mockResolvedValue(widgetConfig);
    i.getPublicIntegration = vi.fn().mockResolvedValue(null);

    const result = await new GetWidgetConfigUseCaseImpl(w, i).execute('app-1');

    expect(result.allowedOrigins).toEqual([]);
  });

  it('propagates repository errors', async () => {
    const w = widgetRepo();
    const i = integrationRepo();
    w.getWidgetConfig = vi.fn().mockRejectedValue(new NotFoundError('ClientApplication', 'app-1'));
    i.getPublicIntegration = vi.fn().mockResolvedValue(null);

    await expect(new GetWidgetConfigUseCaseImpl(w, i).execute('app-1')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ExchangeIdentityTokenUseCaseImpl', () => {
  const command = {} as ExchangeIdentityTokenCommand;

  it('delegates to the repository', async () => {
    const result = {} as TokenExchangeResult;
    const repo: TokenExchangeRepository = { exchangeIdentityToken: vi.fn().mockResolvedValue(result) };

    expect(await new ExchangeIdentityTokenUseCaseImpl(repo).execute(command)).toBe(result);
    expect(repo.exchangeIdentityToken).toHaveBeenCalledWith(command);
  });

  it('propagates TokenExchangeError', async () => {
    const repo: TokenExchangeRepository = {
      exchangeIdentityToken: vi.fn().mockRejectedValue(new TokenExchangeError(TokenExchangeErrorCode.INVALID_GRANT)),
    };

    await expect(new ExchangeIdentityTokenUseCaseImpl(repo).execute(command)).rejects.toBeInstanceOf(
      TokenExchangeError,
    );
  });
});

describe('CreateClientApplicationReservationUseCaseImpl', () => {
  const command = {} as CreateClientApplicationReservationCommand;

  it('delegates token and command to the repository', async () => {
    const reservation = {} as ClientApplicationReservation;
    const repo = widgetRepo();
    repo.createReservation = vi.fn().mockResolvedValue(reservation);

    expect(await new CreateClientApplicationReservationUseCaseImpl(repo).execute('tok', command)).toBe(reservation);
    expect(repo.createReservation).toHaveBeenCalledWith('tok', command);
  });

  it('propagates repository errors', async () => {
    const repo = widgetRepo();
    repo.createReservation = vi.fn().mockRejectedValue(new UnprocessableEntityError('nope'));

    await expect(
      new CreateClientApplicationReservationUseCaseImpl(repo).execute('tok', command),
    ).rejects.toBeInstanceOf(UnprocessableEntityError);
  });
});

describe('resolveWidgetAvailability', () => {
  const config: WidgetConfig = { ...widgetConfig, allowedOrigins: [] };

  it('is available for a location in config', () => {
    expect(resolveWidgetAvailability(config, 'loc-1')).toEqual({ available: true, location });
  });

  it('is LOCATION_OUT_OF_SCOPE for an unknown location', () => {
    expect(resolveWidgetAvailability(config, 'other')).toEqual({ available: false, reason: 'LOCATION_OUT_OF_SCOPE' });
  });

  it('is PARTNER_DISABLED when disabled, even for a known location', () => {
    expect(resolveWidgetAvailability({ ...config, enabled: false }, 'loc-1')).toEqual({
      available: false,
      reason: 'PARTNER_DISABLED',
    });
  });
});

describe('mapReservationErrorToUnavailableReason', () => {
  it('maps the consent error code', () => {
    const error = Object.assign(new UnprocessableEntityError('x'), {
      code: 'CLIENT_APPLICATION_LOCATION_CONSENT_NOT_APPROVED',
    });
    expect(mapReservationErrorToUnavailableReason(error)).toBe('CONSENT_NOT_APPROVED');
  });

  it('returns null for other errors', () => {
    expect(mapReservationErrorToUnavailableReason(new UnprocessableEntityError('x'))).toBeNull();
    expect(mapReservationErrorToUnavailableReason(new Error('x'))).toBeNull();
    expect(mapReservationErrorToUnavailableReason(null)).toBeNull();
    expect(mapReservationErrorToUnavailableReason('str')).toBeNull();
  });
});

describe('isAllowedMessageOrigin', () => {
  const allowed = ['https://partner.rs', 'http://localhost:3000'];

  it('accepts an exact origin', () => {
    expect(isAllowedMessageOrigin('https://partner.rs', allowed)).toBe(true);
    expect(isAllowedMessageOrigin('http://localhost:3000', allowed)).toBe(true);
  });

  it('rejects a message from a disallowed origin', () => {
    expect(isAllowedMessageOrigin('https://evil.com', allowed)).toBe(false);
  });

  it('rejects prefixes, suffixes, other ports/schemes and paths', () => {
    expect(isAllowedMessageOrigin('https://partner.rs.evil.com', allowed)).toBe(false);
    expect(isAllowedMessageOrigin('https://evil-partner.rs', allowed)).toBe(false);
    expect(isAllowedMessageOrigin('http://partner.rs', allowed)).toBe(false);
    expect(isAllowedMessageOrigin('http://localhost:3001', allowed)).toBe(false);
    expect(isAllowedMessageOrigin('https://partner.rs/', allowed)).toBe(false);
  });

  it('does not treat wildcards as patterns', () => {
    expect(isAllowedMessageOrigin('https://a.partner.rs', ['https://*.partner.rs'])).toBe(false);
    expect(isAllowedMessageOrigin('https://anything.com', ['*'])).toBe(false);
  });

  it('always rejects the null origin and an empty origin, even if listed', () => {
    expect(isAllowedMessageOrigin('null', ['null'])).toBe(false);
    expect(isAllowedMessageOrigin('', [''])).toBe(false);
  });

  it('rejects everything for an empty allow-list', () => {
    expect(isAllowedMessageOrigin('https://partner.rs', [])).toBe(false);
  });
});
