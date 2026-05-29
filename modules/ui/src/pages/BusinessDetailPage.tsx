import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '../hooks/useBusinesses';
import { useResources } from '../hooks/useResources';
import { useBusinessServices } from '../hooks/useBusinessServices';
import { useCreateReservation } from '../hooks/useReservations';
import { useAvailabilityRules } from '../hooks/useAvailabilityRules';
import { useAuthStore } from '../state/authStore';
import { BookingWidget } from '../components/booking/BookingWidget';
import type { BookingSelection } from '../components/booking/BookingWidget';
import type { Resource } from '@domain';
import { RESOURCE_TYPE_LABELS } from '@domain';
import styles from './BusinessDetailPage.module.css';

export function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { t } = useTranslation();

  const { data: business, isLoading: bLoading, isError: bError } = useBusiness(id!);
  const { data: resourcesPage, isLoading: rLoading } = useResources(id!);
  const { data: servicesPage } = useBusinessServices(id!);

  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  const { data: availabilityRules = [] } = useAvailabilityRules(selectedResource?.id ?? '');

  const { mutateAsync: createReservation, isPending } = useCreateReservation(
    selectedResource?.id ?? '',
  );

  const handleConfirm = async (selection: BookingSelection) => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    const reservation = await createReservation({
      resourceId: selection.resource.id!,
      serviceId: selection.service.id,
      startTime: selection.startTime,
      endTime: selection.endTime,
    });
    navigate(`/reservation/${reservation.id}/held`, {
      state: { reservation, business, resource: selection.resource },
    });
  };

  if (bLoading || rLoading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (bError || !business) {
    return (
      <div className={styles.page}>
        <div className="error-box">{t('businessDetail.notFound')}</div>
      </div>
    );
  }

  const resources = resourcesPage?.content ?? [];
  const services = servicesPage ?? [];

  const gradients = [
    'linear-gradient(135deg,#c8b89a 0%,#8a7c63 100%)',
    'linear-gradient(135deg,#5e7a6c 0%,#2d4a3d 100%)',
    'linear-gradient(135deg,#d4b89a 0%,#8a6e4f 100%)',
  ];

  return (
    <>
      <div className={styles.detailHead}>
        <div className={styles.images}>
          {gradients.map((g, i) => (
            <div
              key={i}
              className={i === 0 ? styles.imgMain : styles.img}
              style={{ background: g }}
            />
          ))}
        </div>
        <div className={styles.detailMeta}>
          <div className="eyebrow-rule">{t('businessDetail.eyebrow')}</div>
          <h1 className={styles.detailTitle}>{business.name}</h1>
          <div className={styles.tags}>
            {resources.map((r) => (
              <span key={r.id} className="tag">
                {RESOURCE_TYPE_LABELS[r.type]}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.bookingWrap}>
        <BookingWidget
          services={services}
          resources={resources}
          selectedResource={selectedResource}
          onResourceChange={setSelectedResource}
          availabilityRules={availabilityRules}
          onConfirm={handleConfirm}
          isLoading={isPending}
        />
      </div>
    </>
  );
}
