import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMyBusinesses, useCreateBusiness } from '../hooks/useBusinesses';
import { useAuthStore } from '../state/authStore';
import { useAuth } from '../hooks/useAuth';
import styles from './BusinessOnboardingPage.module.css';

export function BusinessOnboardingPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const { initiateLogin } = useAuth();

  const { data, isLoading } = useMyBusinesses(0, 50);
  const { mutateAsync: createBusiness, isPending } = useCreateBusiness();

  const [name, setName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isAuthenticated) {
    initiateLogin();
    return null;
  }

  if (isLoading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
      </div>
    );
  }

  const businesses = data?.content ?? [];
  const activeBusiness = businesses.find((b) => b.status === 'ACTIVE');
  const pendingBusiness = businesses.find((b) => b.status === 'PENDING');
  const rejectedBusiness = businesses.find((b) => b.status === 'REJECTED');

  if (activeBusiness) {
    return <Navigate to="/dashboard" replace />;
  }

  const showPending = submitted || !!pendingBusiness;

  const handleSubmit = async (e: React.FormEvent) => {
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
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        },
      });
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('businessOnboarding.errorSubmit'));
    }
  };

  if (showPending) {
    return (
      <div className={styles.page}>
        <div className={styles.pendingCard}>
          <div className={styles.pendingIcon}>⏳</div>
          <h1 className={styles.pendingTitle}>{t('businessOnboarding.pendingTitle')}</h1>
          <p className={styles.pendingSubtitle}>{t('businessOnboarding.pendingSubtitle')}</p>
          <p className={styles.pendingInfo}>{t('businessOnboarding.pendingInfo')}</p>
          <Link to="/" className="btn btn-ghost">
            {t('businessOnboarding.backHome')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.header}>
          <div className="eyebrow-rule">{t('businessOnboarding.eyebrow')}</div>
          <h1 className={styles.title}>{t('businessOnboarding.title')}</h1>
          <p className={styles.subtitle}>{t('businessOnboarding.subtitle')}</p>
        </div>

        {rejectedBusiness && (
          <div className="error-box" style={{ marginBottom: 20 }}>
            {t('businessOnboarding.rejectedNote')}
          </div>
        )}

        {error && (
          <div className="error-box" style={{ marginBottom: 20 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="form-field">
            <label className="form-label">{t('businessOnboarding.nameLabel')}</label>
            <input
              className="form-input"
              placeholder={t('businessOnboarding.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className={styles.locationSection}>
            <div className={styles.locationTitle}>{t('businessOnboarding.locationTitle')}</div>
            <div className={styles.locationGrid}>
              <div className="form-field">
                <label className="form-label">{t('businessOnboarding.locationName')}</label>
                <input
                  className="form-input"
                  placeholder={t('businessOnboarding.locationNamePlaceholder')}
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label">{t('businessOnboarding.locationCity')}</label>
                <input
                  className="form-input"
                  placeholder={t('businessOnboarding.locationCityPlaceholder')}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label">{t('businessOnboarding.locationAddress')}</label>
                <input
                  className="form-input"
                  placeholder={t('businessOnboarding.locationAddressPlaceholder')}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label">{t('businessOnboarding.locationPhone')}</label>
                <input
                  className="form-input"
                  placeholder={t('businessOnboarding.locationPhonePlaceholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">{t('businessOnboarding.locationEmail')}</label>
                <input
                  className="form-input"
                  placeholder={t('businessOnboarding.locationEmailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label">{t('businessOnboarding.locationLatitude')} *</label>
                <input
                  className="form-input"
                  type="number"
                  step="any"
                  placeholder={t('businessOnboarding.locationLatitudePlaceholder')}
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label">{t('businessOnboarding.locationLongitude')} *</label>
                <input
                  className="form-input"
                  type="number"
                  step="any"
                  placeholder={t('businessOnboarding.locationLongitudePlaceholder')}
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-secondary btn-block" disabled={isPending}>
            {isPending ? t('businessOnboarding.submitting') : t('businessOnboarding.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
