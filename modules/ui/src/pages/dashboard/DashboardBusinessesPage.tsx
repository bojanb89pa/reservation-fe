import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMyBusinesses, useCreateBusiness } from '../../hooks/useBusinesses';
import styles from './DashboardBusinessesPage.module.css';

export function DashboardBusinessesPage() {
  const { data, isLoading } = useMyBusinesses(0, 50);
  const { mutateAsync: createBusiness, isPending } = useCreateBusiness();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      await createBusiness({
        name: name.trim(),
        location: {
          name: locationName.trim() || undefined,
          addressLine1: address.trim() || undefined,
          city: city.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
        },
      });
      setName('');
      setLocationName('');
      setAddress('');
      setCity('');
      setPhone('');
      setEmail('');
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('dashboardBusinesses.errorCreating'));
    }
  };

  return (
    <div>
      <div className={styles.topbar}>
        <div>
          <div className={styles.eyebrow}>{t('dashboard.eyebrow')}</div>
          <h1 className={styles.pageTitle}>{t('dashboardBusinesses.title')}</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? t('dashboardBusinesses.cancelButton') : t('dashboardBusinesses.newBusiness')}
        </button>
      </div>

      {showForm && (
        <div className={styles.formCard}>
          <h3 className={styles.formTitle}>{t('dashboardBusinesses.formTitle')}</h3>
          {error && (
            <div className="error-box" style={{ marginBottom: 12 }}>
              {error}
            </div>
          )}
          <form onSubmit={handleCreate} className={styles.form}>
            <div className="form-field">
              <label className="form-label">{t('dashboardBusinesses.businessNameLabel')}</label>
              <input
                className="form-input"
                placeholder={t('dashboardBusinesses.businessNamePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className={styles.locationSection}>
              <div className={styles.locationSectionTitle}>
                {t('dashboardBusinesses.locationFormTitle')}
              </div>
              <div className={styles.locationGrid}>
                <div className="form-field">
                  <label className="form-label">{t('dashboardBusinesses.locationName')}</label>
                  <input
                    className="form-input"
                    placeholder={t('dashboardBusinesses.locationNamePlaceholder')}
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">{t('dashboardBusinesses.locationCity')}</label>
                  <input
                    className="form-input"
                    placeholder={t('dashboardBusinesses.locationCityPlaceholder')}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">{t('dashboardBusinesses.locationAddress')}</label>
                  <input
                    className="form-input"
                    placeholder={t('dashboardBusinesses.locationAddressPlaceholder')}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">{t('dashboardBusinesses.locationPhone')}</label>
                  <input
                    className="form-input"
                    placeholder={t('dashboardBusinesses.locationPhonePlaceholder')}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">{t('dashboardBusinesses.locationEmail')}</label>
                  <input
                    className="form-input"
                    placeholder={t('dashboardBusinesses.locationEmailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending
                ? t('dashboardBusinesses.creating')
                : t('dashboardBusinesses.createBusiness')}
            </button>
          </form>
        </div>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t('dashboardBusinesses.allBusinesses')}</h2>
          <span className={styles.sectionMeta}>
            {t('dashboardBusinesses.registered', { count: data?.totalElements ?? 0 })}
          </span>
        </div>

        {isLoading && (
          <div className="page-loading">
            <div className="spinner" />
          </div>
        )}

        <div className={styles.bizList}>
          {data?.content.map((b) => (
            <Link key={b.id} to={`/dashboard/businesses/${b.id}`} className={styles.bizRow}>
              <div className={styles.bizInfo}>
                <span className={styles.bizName}>{b.name}</span>
                <span className={styles.bizId} title={b.id ?? ''}>
                  {b.id?.slice(0, 8)}…
                </span>
              </div>
              <span className={styles.bizArrow}>{t('dashboardBusinesses.manage')}</span>
            </Link>
          ))}

          {data?.content.length === 0 && (
            <div
              style={{ padding: '28px 20px', color: 'var(--ink-500)', fontSize: 'var(--text-sm)' }}
            >
              {t('dashboardBusinesses.noBusinesses')}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
