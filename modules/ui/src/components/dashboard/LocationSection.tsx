import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusinessLocations, useCreateBusinessLocation } from '../../hooks/useBusinessLocations';
import { LocationAssignmentsSection } from '../business-location/LocationAssignmentsSection';
import styles from './LocationSection.module.css';

interface Props {
  businessId: string;
}

export function LocationSection({ businessId }: Props) {
  const { t } = useTranslation();
  const { data: locations = [] } = useBusinessLocations(businessId);
  const { mutateAsync: createLocation, isPending, error } = useCreateBusinessLocation(businessId);

  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await createLocation({
      name: locationName.trim() || undefined,
      addressLine1: address.trim() || undefined,
      city: city.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      website: website.trim() || undefined,
    });
    setLocationName('');
    setAddress('');
    setCity('');
    setPhone('');
    setEmail('');
    setWebsite('');
    setShowForm(false);
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{t('locationSection.title')}</h2>
        <span className={styles.sectionMeta}>
          {t('locationSection.total', { count: locations.length })}
        </span>
      </div>

      <div className={styles.list}>
        {locations.length === 0 && (
          <div className={styles.empty}>{t('locationSection.noLocations')}</div>
        )}
        {locations.map((loc) => (
          <div key={loc.id} className={styles.locationItem}>
            <div className={styles.row}>
              <div>
                <div className={styles.locationName}>{loc.name ?? loc.city ?? '—'}</div>
                {(loc.addressLine1 || loc.city) && (
                  <div className={styles.locationAddress}>
                    {[loc.addressLine1, loc.city, loc.postalCode].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
              <div className={styles.locationContacts}>
                {loc.phone && <span className={styles.contactItem}>{loc.phone}</span>}
                {loc.email && <span className={styles.contactItem}>{loc.email}</span>}
                {loc.website && <span className={styles.contactItem}>{loc.website}</span>}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  setActiveLocationId(activeLocationId === loc.id ? null : loc.id)
                }
              >
                {activeLocationId === loc.id
                  ? t('locationSection.collapse')
                  : t('locationSection.manage')}
              </button>
            </div>
            {activeLocationId === loc.id && (
              <LocationAssignmentsSection businessId={businessId} locationId={loc.id} />
            )}
          </div>
        ))}
      </div>

      {showForm ? (
        <div className={styles.addForm}>
          <div className={styles.addFormTitle}>{t('locationSection.addFormTitle')}</div>
          <form onSubmit={handleAdd}>
            <div className={styles.formGrid}>
              <div className="form-field">
                <label className="form-label">{t('locationSection.nameLabel')}</label>
                <input
                  className="form-input"
                  placeholder={t('locationSection.namePlaceholder')}
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label">{t('locationSection.cityLabel')}</label>
                <input
                  className="form-input"
                  placeholder={t('locationSection.cityPlaceholder')}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label">{t('locationSection.addressLabel')}</label>
                <input
                  className="form-input"
                  placeholder={t('locationSection.addressPlaceholder')}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label">{t('locationSection.phoneLabel')}</label>
                <input
                  className="form-input"
                  placeholder={t('locationSection.phonePlaceholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label">{t('locationSection.emailLabel')}</label>
                <input
                  className="form-input"
                  placeholder={t('locationSection.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label">{t('locationSection.websiteLabel')}</label>
                <input
                  className="form-input"
                  placeholder={t('locationSection.websitePlaceholder')}
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.formActions}>
              <button type="submit" className="btn btn-secondary" disabled={isPending}>
                {isPending ? t('locationSection.saving') : t('locationSection.addButton')}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowForm(false)}
              >
                {t('locationSection.cancel')}
              </button>
            </div>
          </form>
          {error && (
            <div className={styles.error}>
              {error instanceof Error ? error.message : t('locationSection.errorAdd')}
            </div>
          )}
        </div>
      ) : (
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 12 }}
          onClick={() => setShowForm(true)}
        >
          {t('locationSection.addButton')}
        </button>
      )}
    </section>
  );
}
