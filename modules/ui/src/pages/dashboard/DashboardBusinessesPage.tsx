import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { PlaceAutocompleteSuggestion } from '@domain';
import {
  useMyBusinesses,
  useAllBusinessesForAdmin,
  useCreateBusiness,
} from '../../hooks/useBusinesses';
import { useIsAdmin } from '../../hooks/useAuth';
import { usePlaceSearch } from '../../hooks/usePlaceSearch';
import { usePlaceDetails } from '../../hooks/usePlaceDetails';
import styles from './DashboardBusinessesPage.module.css';

export function DashboardBusinessesPage() {
  const isAdmin = useIsAdmin();
  const myBusinessesQuery = useMyBusinesses(0, 50);
  const adminBusinessesQuery = useAllBusinessesForAdmin(0, 100);
  const { data, isLoading } = isAdmin ? adminBusinessesQuery : myBusinessesQuery;
  const { mutateAsync: createBusiness, isPending } = useCreateBusiness();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(() => searchParams.get('new') === '1');

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
    !!placeDetails && placeDetails.latitude != null && placeDetails.longitude != null;

  const handleSelectSuggestion = (placeId: string) => {
    setSelectedPlaceId(placeId);
    setQuery('');
  };

  const handleChangePlace = () => {
    setSelectedPlaceId(null);
    setPhone('');
    setSessionToken(crypto.randomUUID());
  };

  const resetLocationForm = () => {
    setQuery('');
    setSelectedPlaceId(null);
    setSessionToken(crypto.randomUUID());
    setLocationName('');
    setPhone('');
    setEmail('');
  };

  const handleCreate = async (e: React.FormEvent) => {
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
      setName('');
      resetLocationForm();
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
        <button
          className="btn btn-secondary"
          onClick={() => {
            if (showForm) resetLocationForm();
            setShowForm((v) => !v);
          }}
        >
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
                <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">
                    {t('dashboardBusinesses.locationPlaceLabel')}
                  </label>
                  {selectedPlaceId ? (
                    isLoadingDetails ? (
                      <div className={styles.placeLoading}>
                        {t('dashboardBusinesses.locationSearching')}
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
                            {t('dashboardBusinesses.locationChangePlace')}
                          </button>
                        </div>
                        {placeDetails.latitude == null && (
                          <div className={styles.fieldError}>
                            {t('dashboardBusinesses.locationNoCoordinates')}
                          </div>
                        )}
                      </>
                    ) : null
                  ) : (
                    <div className={styles.placeSearchWrapper}>
                      <input
                        className="form-input"
                        placeholder={t('dashboardBusinesses.locationPlacePlaceholder')}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      {isSearching && query.length >= 2 && (
                        <div className={styles.searchHint}>
                          {t('dashboardBusinesses.locationSearching')}
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
                  <label className="form-label">{t('dashboardBusinesses.locationName')}</label>
                  <input
                    className="form-input"
                    placeholder={t('dashboardBusinesses.locationNamePlaceholder')}
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
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
                <div className="form-field" style={{ gridColumn: '1 / -1' }}>
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

            <button type="submit" className="btn btn-secondary" disabled={isPending || !canSubmit}>
              {isPending
                ? t('dashboardBusinesses.creating')
                : t('dashboardBusinesses.createBusiness')}
            </button>
          </form>
        </div>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            {isAdmin
              ? t('dashboardBusinesses.allBusinessesAdmin')
              : t('dashboardBusinesses.allBusinesses')}
          </h2>
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
                {isAdmin && (
                  <span className={[styles.bizStatus, styles[`bizStatus${b.status}`]].join(' ')}>
                    {b.status}
                  </span>
                )}
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
