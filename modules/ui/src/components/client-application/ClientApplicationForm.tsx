import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Business, ClientApplicationScope, CreateClientApplicationCommand } from '@fe/domain';
import { useAllBusinessesForAdminComplete } from '../../hooks/useBusinesses';
import { useBusinessLocations } from '../../hooks/useBusinessLocations';
import { useBusinessCategories } from '../../hooks/useBusinessCategories';
import styles from './ClientApplicationForm.module.css';

type ScopeType = ClientApplicationScope['type'];

const SCOPE_TYPES: ScopeType[] = [
  'SINGLE_LOCATION',
  'MULTIPLE_LOCATIONS',
  'LOCATION_LIST',
  'CATEGORY',
];

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
  // LOCATION_LIST spans several businesses, so picks (id → label) survive switching the browsed business.
  const [pickedLocations, setPickedLocations] = useState<Record<string, string>>({});

  const [businessFilter, setBusinessFilter] = useState('');
  const { data: allBusinesses, isLoading: businessesLoading } = useAllBusinessesForAdminComplete();
  const normalizedFilter = businessFilter.trim().toLowerCase();
  const businesses = (allBusinesses ?? [])
    .filter((b): b is Business & { id: string } => b.id !== null)
    .filter(
      (b) =>
        normalizedFilter === '' ||
        b.id === businessId ||
        b.name.toLowerCase().includes(normalizedFilter),
    );

  // WARNING: SINGLE_LOCATION also requires picking a business first, since there is no global
  // location listing endpoint to search locations directly — verify before merging.
  const needsBusiness =
    scopeType === 'SINGLE_LOCATION' ||
    scopeType === 'MULTIPLE_LOCATIONS' ||
    scopeType === 'LOCATION_LIST';
  const { data: locations = [] } = useBusinessLocations(needsBusiness ? businessId : '');

  const { data: categories = [] } = useBusinessCategories();

  const handleScopeTypeChange = (type: ScopeType) => {
    setScopeType(type);
    setBusinessId('');
    setLocationId('');
    setLocationIds([]);
    setPickedLocations({});
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

  const togglePickedLocation = (id: string, label: string) => {
    setPickedLocations((prev) => {
      if (id in prev) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: label };
    });
  };

  const buildScope = (): ClientApplicationScope | null => {
    if (scopeType === 'LOCATION_LIST') {
      const ids = Object.keys(pickedLocations);
      return ids.length > 0 ? { type: 'LOCATION_LIST', locationIds: ids } : null;
    }
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
          <label className="form-label" htmlFor="client-application-business-filter">
            {t('clientApplicationForm.businessFilterLabel')}
          </label>
          <input
            id="client-application-business-filter"
            className="form-input"
            placeholder={t('clientApplicationForm.businessFilterPlaceholder')}
            value={businessFilter}
            onChange={(e) => setBusinessFilter(e.target.value)}
          />
          <label className="form-label" htmlFor="client-application-business">
            {t('clientApplicationForm.businessLabel')}
          </label>
          <select
            id="client-application-business"
            className="form-input"
            value={businessId}
            disabled={businessesLoading}
            onChange={(e) => handleBusinessChange(e.target.value)}
          >
            <option value="">
              {businessesLoading
                ? t('clientApplicationForm.loadingBusinesses')
                : t('clientApplicationForm.selectBusinessPlaceholder')}
            </option>
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

      {scopeType === 'LOCATION_LIST' && businessId && (
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>{t('clientApplicationForm.locationsLabel')}</legend>
          {locations.length === 0 && (
            <div className={styles.empty}>{t('clientApplicationForm.noLocations')}</div>
          )}
          {locations.map((loc) => (
            <label key={loc.id} className={styles.checkboxOption}>
              <input
                type="checkbox"
                checked={loc.id in pickedLocations}
                onChange={() => togglePickedLocation(loc.id, locationLabel(loc))}
              />
              {locationLabel(loc)}
            </label>
          ))}
        </fieldset>
      )}

      {scopeType === 'LOCATION_LIST' && (
        <div className="form-field">
          <div className="form-label">{t('clientApplicationForm.selectedLocationsLabel')}</div>
          {Object.keys(pickedLocations).length === 0 ? (
            <div className={styles.empty}>{t('clientApplicationForm.noSelectedLocations')}</div>
          ) : (
            <ul aria-label={t('clientApplicationForm.selectedLocationsLabel')}>
              {Object.entries(pickedLocations).map(([id, label]) => (
                <li key={id}>
                  {label}{' '}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    aria-label={t('clientApplicationForm.removeLocation', { name: label })}
                    onClick={() => togglePickedLocation(id, label)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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
          {isPending ? t('clientApplicationForm.registering') : t('clientApplicationForm.register')}
        </button>
      </div>
    </form>
  );
}
