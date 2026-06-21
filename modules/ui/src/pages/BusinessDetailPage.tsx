import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '../hooks/useBusinesses';
import { useResources } from '../hooks/useResources';
import { useBusinessServices } from '../hooks/useBusinessServices';
import { useCreateReservation } from '../hooks/useReservations';
import { useAuthStore } from '../state/authStore';
import { BookingWidget } from '../components/booking/BookingWidget';
import type { BookingSelection } from '../components/booking/BookingWidget';
import type { Resource } from '@domain';
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
    'radial-gradient(120% 160% at 18% 0%,#7C7CF8 0%,#34346B 55%,#12132B 100%)',
    'radial-gradient(120% 160% at 80% 10%,#3EE6C4 0%,#1E5E58 60%,#0B1B22 100%)',
    'radial-gradient(120% 160% at 50% 0%,#67D6FF 0%,#2E4E7A 60%,#10142B 100%)',
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
          {business.category && (
            <span className="tag" style={{ color: business.category.color ?? undefined }}>
              {business.category.symbol} {business.category.name}
            </span>
          )}
          <h1 className={styles.detailTitle}>{business.name}</h1>
          <div className={styles.tags}>
            {resources.map((r) => (
              <span key={r.id} className="tag">
                {t(`resourceType.${r.type}`)}
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
          onConfirm={handleConfirm}
          isLoading={isPending}
        />
      </div>
    </>
  );
}
