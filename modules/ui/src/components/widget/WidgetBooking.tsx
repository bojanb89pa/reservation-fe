import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ReservationSlotTakenError,
  TokenExchangeError,
  TokenExchangeErrorCode,
  WIDGET_PROTOCOL_VERSION,
  WidgetMessageType,
  toReservationCreatedPayload,
} from '@fe/domain';
import type {
  ClientApplicationWidgetLocation,
  IdentityTokenType,
  Resource,
  ReservationCreatedPayload,
  WidgetToHostMessage,
  WidgetUnavailableReason,
} from '@fe/domain';
import { mapReservationErrorToUnavailableReason } from '@fe/application';
import { BookingWidget } from '../booking/BookingWidget';
import type { BookingSelection } from '../booking/BookingWidget';
import { useResources } from '../../hooks/useResources';
import { useBusinessServices } from '../../hooks/useBusinessServices';
import { useInvalidateResourceSlots } from '../../hooks/useResourceSlots';
import { useWidgetReservation, WidgetSignInRequiredError } from '../../hooks/useWidgetReservation';
import styles from './WidgetApp.module.css';

interface Props {
  clientApplicationId: string;
  location: ClientApplicationWidgetLocation;
  identityToken: string | null | undefined;
  requestIdentity: () => Promise<string | null>;
  getIdentityTokenType?: () => IdentityTokenType | undefined;
  send: (message: WidgetToHostMessage) => void;
  onUnavailable: (reason: WidgetUnavailableReason) => void;
}

const TOKEN_EXCHANGE_CODES: readonly string[] = Object.values(TokenExchangeErrorCode);

function errorKeyFor(error: unknown): string {
  if (error instanceof ReservationSlotTakenError) return 'widget.error.slotTaken';
  if (error instanceof WidgetSignInRequiredError) return 'widget.error.signInRequired';
  if (error instanceof TokenExchangeError && TOKEN_EXCHANGE_CODES.includes(error.code)) {
    return `widget.error.${error.code}`;
  }
  return 'widget.error.generic';
}

export function WidgetBooking({
  clientApplicationId,
  location,
  identityToken,
  requestIdentity,
  getIdentityTokenType,
  send,
  onUnavailable,
}: Props) {
  const { t } = useTranslation();
  // WARNING: resources and services are the whole business's, not filtered by location — verify before merging
  const { data: resourcesPage, isLoading: resourcesLoading } = useResources(location.businessId);
  const { data: services, isLoading: servicesLoading } = useBusinessServices(location.businessId);
  const invalidateSlots = useInvalidateResourceSlots();
  const { mutateAsync: createReservation, isPending } = useWidgetReservation({
    clientApplicationId,
    requestIdentity,
    identityToken,
    getIdentityTokenType,
  });

  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [created, setCreated] = useState<ReservationCreatedPayload | null>(null);
  // Choice made by a guest; kept until the partner signs the user in and the booking completes.
  const [pending, setPending] = useState<BookingSelection | null>(null);
  const submittingRef = useRef(false);

  async function handleConfirm(selection: BookingSelection) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setErrorKey(null);
    try {
      const reservation = await createReservation({
        resourceId: selection.resource.id!,
        locationId: location.locationId,
        serviceId: selection.service.id,
        startTime: selection.startTime,
        endTime: selection.endTime,
      });
      const payload = toReservationCreatedPayload(reservation, location.locationName);
      send({
        v: WIDGET_PROTOCOL_VERSION,
        type: WidgetMessageType.RESERVATION_CREATED,
        reservation: payload,
      });
      setPending(null);
      setCreated(payload);
    } catch (error: unknown) {
      if (error instanceof WidgetSignInRequiredError) {
        setPending(selection);
        send({ v: WIDGET_PROTOCOL_VERSION, type: WidgetMessageType.SIGN_IN_REQUIRED });
        return;
      }
      setPending(null);
      const reason = mapReservationErrorToUnavailableReason(error);
      if (reason) {
        onUnavailable(reason);
        return;
      }
      if (error instanceof ReservationSlotTakenError && selection.resource.id) {
        await invalidateSlots(selection.resource.id);
      }
      setErrorKey(errorKeyFor(error));
    } finally {
      submittingRef.current = false;
    }
  }

  // The partner signed the user in (`reserva:identity` with a token): finish the saved booking.
  const completePending = useRef(handleConfirm);
  completePending.current = handleConfirm;
  useEffect(() => {
    if (pending && typeof identityToken === 'string') void completePending.current(pending);
  }, [pending, identityToken]);

  if (resourcesLoading || servicesLoading) {
    return (
      <p className={styles.message} role="status">
        {t('widget.loading')}
      </p>
    );
  }

  if (created) {
    return (
      <section className={styles.created} role="status" data-testid="widget-reservation-created">
        <h2 className={styles.createdTitle}>{t('widget.created.title')}</h2>
        <p>{t(`widget.created.${created.status}`)}</p>
        <p className={styles.createdWhen}>
          {created.startTime.replace('T', ' ').slice(0, 16)} –{' '}
          {created.endTime.replace('T', ' ').slice(0, 16)}
        </p>
      </section>
    );
  }

  if (pending) {
    return (
      <section className={styles.message} role="status" data-testid="widget-sign-in-pending">
        <h2 className={styles.createdTitle}>{t('widget.signInPending.title')}</h2>
        <p className={styles.createdWhen}>
          {pending.startTime.replace('T', ' ').slice(0, 16)} –{' '}
          {pending.endTime.replace('T', ' ').slice(0, 16)}
        </p>
        <p>
          {pending.service.name} · {pending.resource.name}
        </p>
        <p>{isPending ? t('widget.signInPending.completing') : t('widget.signInRequired')}</p>
        <button type="button" className={styles.cancel} onClick={() => setPending(null)}>
          {t('widget.signInPending.cancel')}
        </button>
      </section>
    );
  }

  const resources = (resourcesPage?.content ?? []).filter((r) => r.id);

  return (
    <>
      {errorKey && (
        <p className={`${styles.message} ${styles.error}`} role="alert" data-testid="widget-error">
          {t(errorKey)}
        </p>
      )}
      <BookingWidget
        hideHeader
        services={services ?? []}
        resources={resources}
        selectedResource={selectedResource}
        onResourceChange={setSelectedResource}
        onConfirm={handleConfirm}
        isLoading={isPending || identityToken === undefined}
      />
    </>
  );
}
