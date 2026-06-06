import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { PlaceAutocompleteSuggestion } from '@domain';
import { useMyBusinesses, useCreateBusiness } from '../hooks/useBusinesses';
import { useAuthStore } from '../state/authStore';
import { useAuth } from '../hooks/useAuth';
import { usePlaceSearch } from '../hooks/usePlaceSearch';
import { usePlaceDetails } from '../hooks/usePlaceDetails';
import styles from './BusinessOnboardingPage.module.css';

export function BusinessOnboardingPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const { initiateLogin } = useAuth();

  const { data, isLoading } = useMyBusinesses(0, 50);
  const { mutateAsync: createBusiness, isPending } = useCreateBusiness();

  const [name, setName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Place search
  const [query, setQuery] = useState('');
  const [sessionToken, setSessionToken] = useState(() => crypto.randomUUID());
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const { data: suggestions = [], isFetching: isSearching } = usePlaceSearch(query, sessionToken);
  const { data: placeDetails, isLoading: isLoadingDetails } = usePlaceDetails(
    selectedPlaceId,
    sessionToken,
  );

  useEffect(() => {
    if (placeDetails) {
      setPhone(placeDetails.phone ?? '');
    }
  }, [placeDetails]);

  const canSubmit =
    !!placeDetails &&
    placeDetails.latitude != null &&
    placeDetails.longitude != null;

  const handleSelectSuggestion = (placeId: string) => {
    setSelectedPlaceId(placeId);
    setQuery('');
  };

  const handleChangePlace = () => {
    setSelectedPlaceId(null);
    setPhone('');
    setSessionToken(crypto.randomUUID());
  };

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
    if (!placeDetails || placeDetails.latitude == null || placeDetails.longitude == null) return;
    setError(null);
    try {
      await createBusiness({
        name: name.trim(),
        location: {
          name: locationName.trim() || undefined,
          addressLine1: placeDetails.addressLine1 ?? undefined,
          city: placeDetails.city ?? undefined,
          postalCode: placeDetails.postalCode ?? undefined,
          countryCode: placeDetails.countryCode ?? undefined,
          latitude: placeDetails.latitude,
          longitude: placeDetails.longitude,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          googlePlaceId: placeDetails.placeId,
          googleMapsUrl: placeDetails.googleMapsUrl ?? undefined,
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
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">{t('businessOnboarding.locationPlaceLabel')}</label>
                {selectedPlaceId ? (
                  isLoadingDetails ? (
                    <div className={styles.placeLoading}>
                      {t('businessOnboarding.locationSearching')}
                    </div>
                  ) : placeDetails ? (
                    <>
                      <div className={styles.selectedPlace}>
                        <div className={styles.selectedPlaceInfo}>
                          {placeDetails.name && (
                            <span className={styles.selectedPlaceName}>{placeDetails.name}</span>
                          )}
                          {placeDetails.formattedAddress && (
                            <span className={styles.selectedPlaceAddress}>
                              {placeDetails.formattedAddress}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={handleChangePlace}
                        >
                          {t('businessOnboarding.locationChangePlace')}
                        </button>
                      </div>
                      {placeDetails.latitude == null && (
                        <div className={styles.fieldError}>
                          {t('businessOnboarding.locationNoCoordinates')}
                        </div>
                      )}
                    </>
                  ) : null
                ) : (
                  <div className={styles.placeSearchWrapper}>
                    <input
                      className="form-input"
                      placeholder={t('businessOnboarding.locationPlacePlaceholder')}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {isSearching && query.length >= 2 && (
                      <div className={styles.searchHint}>
                        {t('businessOnboarding.locationSearching')}
                      </div>
                    )}
                    {suggestions.length > 0 && (
                      <ul className={styles.suggestionList}>
                        {suggestions.map((s: PlaceAutocompleteSuggestion) => (
                          <li key={s.placeId}>
                            <button
                              type="button"
                              className={styles.suggestionButton}
                              onClick={() => handleSelectSuggestion(s.placeId)}
                            >
                              <span className={styles.suggestionName}>{s.displayName}</span>
                              {s.address && (
                                <span className={styles.suggestionAddress}>{s.address}</span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

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
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-secondary btn-block"
            disabled={isPending || !canSubmit}
          >
            {isPending ? t('businessOnboarding.submitting') : t('businessOnboarding.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
