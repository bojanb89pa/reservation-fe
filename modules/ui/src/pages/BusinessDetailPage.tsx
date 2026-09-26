import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '../hooks/useBusinesses';
import { useResources } from '../hooks/useResources';
import { useBusinessServices } from '../hooks/useBusinessServices';
import { useBusinessLocations } from '../hooks/useBusinessLocations';
import { useCreateReservation } from '../hooks/useReservations';
import { useAuth } from '../hooks/useAuth';
import { BookingWidget } from '../components/booking/BookingWidget';
import type { BookingSelection } from '../components/booking/BookingWidget';
import type { Resource } from '@domain';
import { DEFAULT_CATEGORY_COLOR } from '@domain';
import { BusinessImage } from '../components/business/BusinessImage';
import { BusinessLocationsList } from '../components/business/BusinessLocationsList';
import styles from './BusinessDetailPage.module.css';

// WARNING: assumed the normalized API error exposes a numeric `status` — verify before merging
function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { status?: number }).status === 404
  );
}

export function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, initiateLogin } = useAuth();
  const { t } = useTranslation();

  const {
    data: business,
    isLoading: bLoading,
    isError: bError,
    error: bErrorValue,
  } = useBusiness(id!);
  const { data: resourcesPage, isLoading: rLoading } = useResources(id!);
  const { data: servicesPage } = useBusinessServices(id!);
  const { data: locations } = useBusinessLocations(id!);

  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  const { mutateAsync: createReservation, isPending } = useCreateReservation(
    selectedResource?.id ?? '',
  );

  const handleConfirm = async (selection: BookingSelection) => {
    if (!isAuthenticated) {
      initiateLogin();
      return;
    }
    const reservation = await createReservation({
      resourceId: selection.resource.id!,
      serviceId: selection.service.id,
      startTime: selection.startTime,
      endTime: selection.endTime,
    });
    navigate(`/reservation/${reservation.id}/held`, {
      state: { reservation, business, resource: selection.resource, service: selection.service },
    });
  };

  if (bLoading || rLoading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
      </div>
    );
  }

  // The backend answers a missing business with 404, so an unknown id is its own state.
  if (bError || !business) {
    const isMissing = !bError || isNotFoundError(bErrorValue);
    return (
      <div className={styles.page}>
        <div className="error-box">
          {isMissing ? t('businessDetail.notFound') : t('businessDetail.loadError')}
        </div>
      </div>
    );
  }

  const resources = resourcesPage?.content ?? [];
  const services = servicesPage ?? [];

  return (
    <>
      <div className={styles.detailHead}>
        <div className="eyebrow-rule">{t('businessDetail.eyebrow')}</div>
        <div className={styles.hero}>
          <BusinessImage
            name={business.name}
            imageUrl={business.imageUrl}
            seed={business.id}
            variant="hero"
          >
            {business.category && (
              <span
                className={styles.heroCategory}
                style={{ backgroundColor: business.category.color ?? DEFAULT_CATEGORY_COLOR }}
              >
                {business.category.symbol && <span>{business.category.symbol}</span>}
                {business.category.name}
              </span>
            )}
            <h1 className={styles.detailTitle}>{business.name}</h1>
          </BusinessImage>
        </div>
        <div className={styles.detailMeta}>
          <div className={styles.tags}>
            {resources.map((r) => (
              <span key={r.id} className="tag">
                {t(`resourceType.${r.type}`)}
              </span>
            ))}
          </div>
          <BusinessLocationsList locations={locations} />
        </div>
      </div>

      <div className={styles.bookingWrap}>
        <BookingWidget
          services={services}
          resources={resources}
          selectedResource={selectedResource}
          onResourceChange={setSelectedResource}
          onConfirm={handleConfirm}
          isLoading={isPending}
        />
      </div>
    </>
  );
}
