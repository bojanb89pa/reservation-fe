import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BusinessService, DurationUnit } from '@domain';
import {
  useBusinessServices,
  useCreateBusinessService,
  useUpdateBusinessService,
  useDeleteBusinessService,
} from '../../hooks/useBusinessServices';
import { ServiceForm } from './ServiceForm';
import { DeleteServiceDialog } from './DeleteServiceDialog';
import styles from './ServiceSection.module.css';

type Mode =
  | { type: 'idle' }
  | { type: 'create' }
  | { type: 'edit'; service: BusinessService }
  | { type: 'delete'; service: BusinessService };

interface Props {
  businessId: string;
}

export function ServiceSection({ businessId }: Props) {
  const { t } = useTranslation();
  const { data: services = [] } = useBusinessServices(businessId);
  const { mutateAsync: create, isPending: creating } = useCreateBusinessService(businessId);
  const { mutateAsync: update, isPending: updating } = useUpdateBusinessService(businessId);
  const { mutateAsync: remove, isPending: deleting } = useDeleteBusinessService(businessId);

  const [mode, setMode] = useState<Mode>({ type: 'idle' });
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const reset = () => {
    setMode({ type: 'idle' });
    setFormError(null);
    setDeleteError(null);
  };

  const durationLabels: Record<DurationUnit, string> = {
    MINUTES: t('serviceSection.minutes'),
    HOURS: t('serviceSection.hours'),
    DAYS: t('serviceSection.days'),
  };

  const handleSave = async (name: string, duration: number, durationUnit: DurationUnit) => {
    setFormError(null);
    try {
      if (mode.type === 'create') {
        await create({ name, duration, durationUnit });
      } else if (mode.type === 'edit') {
        await update({ serviceId: mode.service.id, command: { name, duration, durationUnit } });
      }
      reset();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : t('serviceSection.errorSave'));
    }
  };

  const handleDelete = async () => {
    if (mode.type !== 'delete') return;
    setDeleteError(null);
    try {
      await remove(mode.service.id);
      reset();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : t('serviceSection.errorDelete'));
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{t('serviceSection.title')}</h2>
        <div className={styles.headRight}>
          <span className={styles.sectionMeta}>
            {t('serviceSection.total', { count: services.length })}
          </span>
          {mode.type === 'idle' && (
            <button className="btn btn-secondary btn-sm" onClick={() => setMode({ type: 'create' })}>
              {t('serviceSection.addButton')}
            </button>
          )}
        </div>
      </div>

      {(mode.type === 'create' || mode.type === 'edit') && (
        <div className={styles.formWrap}>
          <h3 className={styles.formTitle}>
            {mode.type === 'create'
              ? t('serviceSection.addFormTitle')
              : t('serviceSection.editFormTitle')}
          </h3>
          <ServiceForm
            initial={mode.type === 'edit' ? mode.service : undefined}
            onSave={handleSave}
            onCancel={reset}
            isPending={creating || updating}
            error={formError}
          />
        </div>
      )}

      <div className={styles.list}>
        {services.length === 0 && (
          <div className={styles.empty}>{t('serviceSection.noServices')}</div>
        )}
        {services.map((s) => (
          <div key={s.id} className={styles.row}>
            <span className={styles.name}>{s.name}</span>
            <span className={styles.duration}>
              {s.duration} {durationLabels[s.durationUnit]}
            </span>
            <div className={styles.rowActions}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setFormError(null);
                  setMode({ type: 'edit', service: s });
                }}
              >
                {t('serviceSection.edit')}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setDeleteError(null);
                  setMode({ type: 'delete', service: s });
                }}
              >
                {t('serviceSection.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {mode.type === 'delete' && (
        <DeleteServiceDialog
          service={mode.service}
          onConfirm={handleDelete}
          onCancel={reset}
          isPending={deleting}
          error={deleteError}
        />
      )}
    </section>
  );
}
