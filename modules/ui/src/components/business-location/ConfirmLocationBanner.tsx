import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlaceSearch } from '../../hooks/usePlaceSearch';
import { usePlaceDetails } from '../../hooks/usePlaceDetails';
import { useUpdateLocationFromPlace } from '../../hooks/useUpdateLocationFromPlace';
import { useConfirmLocation } from '../../hooks/useConfirmLocation';
import styles from './ConfirmLocationBanner.module.css';

interface Props {
  businessId: string;
  locationId: string;
}

type Mode = 'idle' | 'searching' | 'previewing';

function generateSessionToken(): string {
  return crypto.randomUUID();
}

export function ConfirmLocationBanner({ businessId, locationId }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('idle');
  const [query, setQuery] = useState('');
  const [sessionToken, setSessionToken] = useState(generateSessionToken);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const { data: suggestions = [], isLoading: isSearching } = usePlaceSearch(query, sessionToken);
  const { data: placeDetails, isLoading: isLoadingDetails } = usePlaceDetails(
    selectedPlaceId,
    sessionToken,
  );
  const {
    mutateAsync: updateFromPlace,
    isPending: isConfirming,
    error: confirmError,
  } = useUpdateLocationFromPlace(businessId, locationId);
  const { mutateAsync: confirmAsIs, isPending: isConfirmingAsIs } = useConfirmLocation(
    businessId,
    locationId,
  );

  const handleStartSearch = () => {
    setQuery('');
    setSessionToken(generateSessionToken());
    setMode('searching');
  };

  const handleSelectSuggestion = (placeId: string) => {
    setSelectedPlaceId(placeId);
    setMode('previewing');
  };

  const handleConfirmFromPlace = async () => {
    if (!selectedPlaceId) return;
    await updateFromPlace({ placeId: selectedPlaceId, sessionToken });
  };

  const handleConfirmAsIs = async () => {
    await confirmAsIs();
  };

  const handleBackToSearch = () => {
    setSelectedPlaceId(null);
    setMode('searching');
  };

  const handleCancel = () => {
    setMode('idle');
    setQuery('');
    setSelectedPlaceId(null);
  };

  if (mode === 'idle') {
    return (
      <div className={styles.banner}>
        <span className={styles.bannerText}>{t('confirmLocationBanner.prompt')}</span>
        <div className={styles.bannerActions}>
          <button className="btn btn-secondary btn-sm" onClick={handleStartSearch}>
            {t('confirmLocationBanner.findOnGoogle')}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleConfirmAsIs}
            disabled={isConfirmingAsIs}
          >
            {isConfirmingAsIs
              ? t('confirmLocationBanner.confirming')
              : t('confirmLocationBanner.confirmAsIs')}
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'searching') {
    return (
      <div className={styles.searchContainer}>
        <div className={styles.searchHeader}>
          <span className={styles.searchTitle}>{t('confirmLocationBanner.searchTitle')}</span>
          <button className="btn btn-ghost btn-sm" onClick={handleCancel}>
            {t('confirmLocationBanner.cancel')}
          </button>
        </div>
        <input
          className={`form-input ${styles.searchInput}`}
          autoFocus
          placeholder={t('confirmLocationBanner.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {isSearching && query.length >= 2 && (
          <div className={styles.searchHint}>{t('confirmLocationBanner.searching')}</div>
        )}
        {suggestions.length > 0 && (
          <ul className={styles.suggestionList}>
            {suggestions.map((s) => (
              <li key={s.placeId}>
                <button
                  className={styles.suggestionButton}
                  onClick={() => handleSelectSuggestion(s.placeId)}
                >
                  <span className={styles.suggestionName}>{s.displayName}</span>
                  {s.address && <span className={styles.suggestionAddress}>{s.address}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className={styles.previewContainer}>
      <div className={styles.previewHeader}>
        <button className="btn btn-ghost btn-sm" onClick={handleBackToSearch}>
          {t('confirmLocationBanner.backToSearch')}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={handleCancel}>
          {t('confirmLocationBanner.cancel')}
        </button>
      </div>
      {isLoadingDetails ? (
        <div className={styles.previewLoading}>{t('confirmLocationBanner.loadingDetails')}</div>
      ) : placeDetails ? (
        <div className={styles.previewCard}>
          {placeDetails.name && <div className={styles.previewName}>{placeDetails.name}</div>}
          {placeDetails.formattedAddress && (
            <div className={styles.previewAddress}>{placeDetails.formattedAddress}</div>
          )}
          {(placeDetails.phone || placeDetails.website) && (
            <div className={styles.previewMeta}>
              {placeDetails.phone && <span>{placeDetails.phone}</span>}
              {placeDetails.website && <span>{placeDetails.website}</span>}
            </div>
          )}
          <div className={styles.previewActions}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleConfirmFromPlace}
              disabled={isConfirming}
            >
              {isConfirming
                ? t('confirmLocationBanner.confirming')
                : t('confirmLocationBanner.confirmLocation')}
            </button>
          </div>
          {confirmError && (
            <div className={styles.error}>
              {confirmError instanceof Error
                ? confirmError.message
                : t('confirmLocationBanner.errorConfirm')}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
