import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Business, ClientApplicationScope, CreateClientApplicationCommand } from '@domain';
import { useAllBusinessesForAdmin } from '../../hooks/useBusinesses';
import { useBusinessLocations } from '../../hooks/useBusinessLocations';
import { useBusinessCategories } from '../../hooks/useBusinessCategories';
import styles from './ClientApplicationForm.module.css';

type ScopeType = ClientApplicationScope['type'];

const SCOPE_TYPES: ScopeType[] = ['SINGLE_LOCATION', 'MULTIPLE_LOCATIONS', 'CATEGORY'];

interface Props {
  onSubmit: (command: CreateClientApplicationCommand) => Promise<void>;
  isPending: boolean;
}

function locationLabel(location: { name: string | null; addressLine1: string | null; id: string }) {
  return location.name ?? location.addressLine1 ?? location.id;
}

export function ClientApplicationForm({ onSubmit, isPending }: Props) {
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [scopeType, setScopeType] = useState<ScopeType>('SINGLE_LOCATION');
  const [businessId, setBusinessId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState('');

  // Admin-only page: page-size 100 mirrors DashboardBusinessesPage's admin listing.
  const { data: businessesPage } = useAllBusinessesForAdmin(0, 100);
  const businesses = (businessesPage?.content ?? []).filter(
    (b): b is Business & { id: string } => b.id !== null,
  );

  // WARNING: SINGLE_LOCATION also requires picking a business first, since there is no global
  // location listing endpoint to search locations directly — verify before merging.
  const needsBusiness = scopeType === 'SINGLE_LOCATION' || scopeType === 'MULTIPLE_LOCATIONS';
  const { data: locations = [] } = useBusinessLocations(needsBusiness ? businessId : '');

  const { data: categories = [] } = useBusinessCategories();

  const handleScopeTypeChange = (type: ScopeType) => {
    setScopeType(type);
    setBusinessId('');
    setLocationId('');
    setLocationIds([]);
    setCategoryId('');
  };

  const handleBusinessChange = (id: string) => {
    setBusinessId(id);
    setLocationId('');
    setLocationIds([]);
  };

  const toggleLocation = (id: string) => {
    setLocationIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const buildScope = (): ClientApplicationScope | null => {
    if (scopeType === 'SINGLE_LOCATION') {
      return locationId ? { type: 'SINGLE_LOCATION', locationId } : null;
    }
    if (scopeType === 'MULTIPLE_LOCATIONS') {
      return businessId && locationIds.length > 0
        ? { type: 'MULTIPLE_LOCATIONS', businessId, locationIds }
        : null;
    }
    return categoryId ? { type: 'CATEGORY', categoryId } : null;
  };

  const scope = buildScope();
  const canSubmit = name.trim() !== '' && scope !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scope || name.trim() === '') return;
    await onSubmit({ name: name.trim(), scope });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className="form-field">
        <label className="form-label" htmlFor="client-application-name">
          {t('clientApplicationForm.nameLabel')}
        </label>
        <input
          id="client-application-name"
          className="form-input"
          placeholder={t('clientApplicationForm.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{t('clientApplicationForm.scopeTypeLabel')}</legend>
        {SCOPE_TYPES.map((type) => (
          <label key={type} className={styles.radioOption}>
            <input
              type="radio"
              name="client-application-scope-type"
              value={type}
              checked={scopeType === type}
              onChange={() => handleScopeTypeChange(type)}
            />
            {t(`clientApplicationForm.scopeType_${type}`)}
          </label>
        ))}
      </fieldset>

      {needsBusiness && (
        <div className="form-field">
          <label className="form-label" htmlFor="client-application-business">
            {t('clientApplicationForm.businessLabel')}
          </label>
          <select
            id="client-application-business"
            className="form-input"
            value={businessId}
            onChange={(e) => handleBusinessChange(e.target.value)}
          >
            <option value="">{t('clientApplicationForm.selectBusinessPlaceholder')}</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {scopeType === 'SINGLE_LOCATION' && businessId && (
        <div className="form-field">
          <label className="form-label" htmlFor="client-application-location">
            {t('clientApplicationForm.locationLabel')}
          </label>
          <select
            id="client-application-location"
            className="form-input"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            <option value="">{t('clientApplicationForm.selectLocationPlaceholder')}</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {locationLabel(loc)}
              </option>
            ))}
          </select>
        </div>
      )}

      {scopeType === 'MULTIPLE_LOCATIONS' && businessId && (
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>{t('clientApplicationForm.locationsLabel')}</legend>
          {locations.length === 0 && (
            <div className={styles.empty}>{t('clientApplicationForm.noLocations')}</div>
          )}
          {locations.map((loc) => (
            <label key={loc.id} className={styles.checkboxOption}>
              <input
                type="checkbox"
                checked={locationIds.includes(loc.id)}
                onChange={() => toggleLocation(loc.id)}
              />
              {locationLabel(loc)}
            </label>
          ))}
        </fieldset>
      )}

      {scopeType === 'CATEGORY' && (
        <div className="form-field">
          <label className="form-label" htmlFor="client-application-category">
            {t('clientApplicationForm.categoryLabel')}
          </label>
          <select
            id="client-application-category"
            className="form-input"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">{t('clientApplicationForm.selectCategoryPlaceholder')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={styles.actions}>
        <button type="submit" className="btn btn-secondary" disabled={!canSubmit || isPending}>
          {isPending
            ? t('clientApplicationForm.registering')
            : t('clientApplicationForm.register')}
        </button>
      </div>
    </form>
  );
}
