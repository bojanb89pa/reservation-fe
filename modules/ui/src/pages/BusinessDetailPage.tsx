import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBusiness } from '../hooks/useBusinesses';
import { useResources } from '../hooks/useResources';
import { useCreateReservation } from '../hooks/useReservations';
import { useAuthStore } from '../state/authStore';
import { SlotGrid } from '../components/booking/SlotGrid';
import { RequestSummary } from '../components/booking/RequestSummary';
import type { Resource } from '@domain';
import { RESOURCE_TYPE_LABELS } from '@domain';
import styles from './BusinessDetailPage.module.css';

const DEFAULT_SLOTS = [
  '9:00', '9:45', '10:30', '11:15', '12:00', '12:45',
  '13:30', '14:30', '15:15', '16:00', '16:45', '17:30',
];

function formatLocalDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

export function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const { data: business, isLoading: bLoading, isError: bError } = useBusiness(id!);
  const { data: resourcesPage, isLoading: rLoading } = useResources(id!);

  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedDate] = useState(new Date());

  const { mutateAsync: createReservation, isPending } = useCreateReservation(
    selectedResource?.id ?? '',
  );

  const handleConfirm = async (_note: string) => {
    if (!selectedResource?.id || !selectedSlot || !isAuthenticated) {
      navigate('/');
      return;
    }
    const [h, m] = selectedSlot.split(':').map(Number);
    const start = new Date(selectedDate);
    start.setHours(h!, m!, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 45);

    const reservation = await createReservation({
      resourceId: selectedResource.id,
      startTime: start.toISOString().replace('Z', ''),
      endTime: end.toISOString().replace('Z', ''),
    });

    navigate(`/reservation/${reservation.id}/held`, {
      state: { reservation, business, resource: selectedResource },
    });
  };

  if (bLoading || rLoading) {
    return <div className="page-loading"><div className="spinner" /></div>;
  }

  if (bError || !business) {
    return (
      <div className={styles.page}>
        <div className="error-box">Business not found.</div>
      </div>
    );
  }

  const resources = resourcesPage?.content ?? [];

  const gradients = [
    'linear-gradient(135deg,#c8b89a 0%,#8a7c63 100%)',
    'linear-gradient(135deg,#5e7a6c 0%,#2d4a3d 100%)',
    'linear-gradient(135deg,#d4b89a 0%,#8a6e4f 100%)',
  ];

  const when = selectedSlot
    ? `${formatLocalDate(selectedDate)} · ${selectedSlot}`
    : null;

  return (
    <>
      <div className={styles.detailHead}>
        <div className={styles.images}>
          {gradients.map((g, i) => (
            <div key={i} className={i === 0 ? styles.imgMain : styles.img}
              style={{ background: g }} />
          ))}
        </div>
        <div className={styles.detailMeta}>
          <div className="eyebrow-rule">Business</div>
          <h1 className={styles.detailTitle}>{business.name}</h1>
          <div className={styles.tags}>
            {resources.map((r) => (
              <span key={r.id} className="tag">{RESOURCE_TYPE_LABELS[r.type]}</span>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.main}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Resources</h3>
            {resources.length === 0 ? (
              <p style={{ color: 'var(--ink-500)', fontSize: 'var(--text-sm)' }}>
                No resources available yet.
              </p>
            ) : (
              <div className={styles.resourceList}>
                {resources.map((r) => (
                  <button
                    key={r.id}
                    className={[
                      styles.resourceItem,
                      selectedResource?.id === r.id ? styles.resourceItemActive : '',
                    ].join(' ')}
                    onClick={() => { setSelectedResource(r); setSelectedSlot(null); }}
                  >
                    <strong>{r.name}</strong>
                    <span className="eyebrow">{RESOURCE_TYPE_LABELS[r.type]}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {selectedResource && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Pick a time slot</h3>
              <SlotGrid
                slots={DEFAULT_SLOTS}
                selected={selectedSlot}
                onSelect={setSelectedSlot}
                date={formatLocalDate(selectedDate)}
              />
            </section>
          )}
        </div>

        {selectedResource && (
          <div>
            <RequestSummary
              resource={selectedResource}
              businessName={business.name}
              when={when}
              onConfirm={handleConfirm}
              isLoading={isPending}
            />
          </div>
        )}
      </div>
    </>
  );
}
