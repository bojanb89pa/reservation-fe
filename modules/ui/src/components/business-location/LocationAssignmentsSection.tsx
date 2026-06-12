import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResources } from '../../hooks/useResources';
import { useBusinessServices } from '../../hooks/useBusinessServices';
import {
  useLocationResources,
  useAddLocationResource,
  useRemoveLocationResource,
} from '../../hooks/useLocationResources';
import {
  useLocationServices,
  useAddLocationService,
  useRemoveLocationService,
} from '../../hooks/useLocationServices';
import styles from './LocationAssignmentsSection.module.css';

interface Props {
  businessId: string;
  locationId: string;
}

export function LocationAssignmentsSection({ businessId, locationId }: Props) {
  const { t } = useTranslation();

  const { data: resourcesPage } = useResources(businessId);
  const allResources = resourcesPage?.content ?? [];
  const { data: allServices = [] } = useBusinessServices(businessId);

  const { data: assignedResources = [] } = useLocationResources(businessId, locationId);
  const { data: assignedServices = [] } = useLocationServices(businessId, locationId);

  const { mutateAsync: addResource, isPending: addingResource } = useAddLocationResource(
    businessId,
    locationId,
  );
  const { mutateAsync: removeResource, isPending: removingResource } = useRemoveLocationResource(
    businessId,
    locationId,
  );
  const { mutateAsync: addService, isPending: addingService } = useAddLocationService(
    businessId,
    locationId,
  );
  const { mutateAsync: removeService, isPending: removingService } = useRemoveLocationService(
    businessId,
    locationId,
  );

  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [resourceError, setResourceError] = useState<string | null>(null);
  const [serviceError, setServiceError] = useState<string | null>(null);

  const assignedResourceIds = new Set(assignedResources.map((r) => r.resourceId));
  const assignedServiceIds = new Set(assignedServices.map((s) => s.serviceId));

  const availableResources = allResources.filter((r) => !assignedResourceIds.has(r.id));
  const availableServices = allServices.filter((s) => !assignedServiceIds.has(s.id));

  const handleAddResource = async () => {
    if (!selectedResourceId) return;
    setResourceError(null);
    try {
      await addResource({ resourceId: selectedResourceId });
      setSelectedResourceId('');
    } catch (err) {
      setResourceError(err instanceof Error ? err.message : t('locationAssignments.errorAdd'));
    }
  };

  const handleRemoveResource = async (resourceId: string) => {
    setResourceError(null);
    try {
      await removeResource(resourceId);
    } catch (err) {
      setResourceError(err instanceof Error ? err.message : t('locationAssignments.errorRemove'));
    }
  };

  const handleAddService = async () => {
    if (!selectedServiceId) return;
    setServiceError(null);
    try {
      await addService({ serviceId: selectedServiceId });
      setSelectedServiceId('');
    } catch (err) {
      setServiceError(err instanceof Error ? err.message : t('locationAssignments.errorAdd'));
    }
  };

  const handleRemoveService = async (serviceId: string) => {
    setServiceError(null);
    try {
      await removeService(serviceId);
    } catch (err) {
      setServiceError(err instanceof Error ? err.message : t('locationAssignments.errorRemove'));
    }
  };

  return (
    <div className={styles.assignments}>
      <div className={styles.group}>
        <div className={styles.groupHead}>
          <span className={styles.groupTitle}>{t('locationAssignments.resources')}</span>
          <span className={styles.groupMeta}>
            {t('locationAssignments.total', { count: assignedResources.length })}
          </span>
        </div>
        <div className={styles.list}>
          {assignedResources.length === 0 && (
            <div className={styles.empty}>{t('locationAssignments.noResources')}</div>
          )}
          {assignedResources.map((r) => (
            <div key={r.resourceId} className={styles.row}>
              <div className={styles.rowMain}>
                <span className={styles.rowName}>{r.resource?.name ?? r.resourceId}</span>
                {r.resource && (
                  <span className={styles.rowSub}>{t(`resourceType.${r.resource.type}`)}</span>
                )}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => handleRemoveResource(r.resourceId)}
                disabled={removingResource}
              >
                {t('locationAssignments.remove')}
              </button>
            </div>
          ))}
        </div>
        {availableResources.length > 0 && (
          <div className={styles.addRow}>
            <select
              className="form-input"
              value={selectedResourceId}
              onChange={(e) => setSelectedResourceId(e.target.value)}
            >
              <option value="">{t('locationAssignments.selectResource')}</option>
              {availableResources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({t(`resourceType.${r.type}`)})
                </option>
              ))}
            </select>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleAddResource}
              disabled={!selectedResourceId || addingResource}
            >
              {addingResource ? t('locationAssignments.adding') : t('locationAssignments.add')}
            </button>
          </div>
        )}
        {resourceError && <div className={styles.error}>{resourceError}</div>}
      </div>

      <div className={styles.group}>
        <div className={styles.groupHead}>
          <span className={styles.groupTitle}>{t('locationAssignments.services')}</span>
          <span className={styles.groupMeta}>
            {t('locationAssignments.total', { count: assignedServices.length })}
          </span>
        </div>
        <div className={styles.list}>
          {assignedServices.length === 0 && (
            <div className={styles.empty}>{t('locationAssignments.noServices')}</div>
          )}
          {assignedServices.map((s) => (
            <div key={s.serviceId} className={styles.row}>
              <div className={styles.rowMain}>
                <span className={styles.rowName}>{s.service?.name ?? s.serviceId}</span>
                {s.service && (
                  <span className={styles.rowSub}>
                    {s.service.fixedDuration
                      ? s.service.minDuration
                      : `${s.service.minDuration}–${s.service.maxDuration}`}{' '}
                    {t(`serviceSection.${s.service.durationUnit.toLowerCase()}`)}
                  </span>
                )}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => handleRemoveService(s.serviceId)}
                disabled={removingService}
              >
                {t('locationAssignments.remove')}
              </button>
            </div>
          ))}
        </div>
        {availableServices.length > 0 && (
          <div className={styles.addRow}>
            <select
              className="form-input"
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
            >
              <option value="">{t('locationAssignments.selectService')}</option>
              {availableServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleAddService}
              disabled={!selectedServiceId || addingService}
            >
              {addingService ? t('locationAssignments.adding') : t('locationAssignments.add')}
            </button>
          </div>
        )}
        {serviceError && <div className={styles.error}>{serviceError}</div>}
      </div>
    </div>
  );
}
