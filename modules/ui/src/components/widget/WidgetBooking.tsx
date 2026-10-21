import { useState } from 'react';
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
  });

  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [created, setCreated] = useState<ReservationCreatedPayload | null>(null);

  async function handleConfirm(selection: BookingSelection) {
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
      setCreated(payload);
    } catch (error: unknown) {
      const reason = mapReservationErrorToUnavailableReason(error);
      if (reason) {
        onUnavailable(reason);
        return;
      }
      if (error instanceof ReservationSlotTakenError && selection.resource.id) {
        await invalidateSlots(selection.resource.id);
      }
      setErrorKey(errorKeyFor(error));
    }
  }

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
        confirmNotice={identityToken === null ? t('widget.signInRequired') : undefined}
      />
    </>
  );
}
