import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { CreateClientApplicationReservationCommand, IdentityTokenType } from '@fe/domain';
import {
  createClientApplicationReservationUseCase,
  exchangeIdentityTokenUseCase,
} from '../app/container';

/** The partner's user is a guest (or the loader did not answer): nothing to exchange. */
export class WidgetSignInRequiredError extends Error {
  constructor() {
    super('Sign-in on the partner website is required');
    this.name = 'WidgetSignInRequiredError';
  }
}

// The partner token lives ~10 minutes and cannot be refreshed; refresh a bit early.
const EXPIRY_MARGIN_MS = 30_000;

interface Options {
  clientApplicationId: string;
  /** Asks the loader for a fresh ID token (`null` = guest). */
  requestIdentity: () => Promise<string | null>;
  /** Latest identity pushed by the loader; `null` drops the cached partner token. */
  identityToken: string | null | undefined;
  /** Type of the latest identity token; `undefined` means `id_token`. */
  getIdentityTokenType?: () => IdentityTokenType | undefined;
}

/**
 * Books with the partner access token. The token is kept in memory only; when it is missing
 * or about to expire the loader is asked for a new ID token, which is exchanged again.
 */
export function useWidgetReservation({
  clientApplicationId,
  requestIdentity,
  identityToken,
  getIdentityTokenType,
}: Options) {
  const partnerTokenRef = useRef<{ token: string; expiresAt: number } | null>(null);

  useEffect(() => {
    if (identityToken === null) partnerTokenRef.current = null;
  }, [identityToken]);

  return useMutation({
    mutationFn: async (command: CreateClientApplicationReservationCommand) => {
      let partner = partnerTokenRef.current;
      if (!partner || partner.expiresAt <= Date.now()) {
        const idToken = await requestIdentity();
        if (idToken === null) throw new WidgetSignInRequiredError();
        const result = await exchangeIdentityTokenUseCase.execute({
          clientApplicationId,
          idToken,
          subjectTokenType: getIdentityTokenType?.(),
        });
        partner = {
          token: result.accessToken,
          expiresAt: Date.now() + result.expiresIn * 1000 - EXPIRY_MARGIN_MS,
        };
        partnerTokenRef.current = partner;
      }
      return createClientApplicationReservationUseCase.execute(partner.token, command);
    },
  });
}
