import { useTranslation } from 'react-i18next';
import type { BusinessLocation } from '@domain';
import styles from './BusinessLocationsList.module.css';

interface Props {
  locations: BusinessLocation[] | undefined;
}

export function BusinessLocationsList({ locations }: Props) {
  const { t } = useTranslation();

  if (!locations || locations.length === 0) {
    return null;
  }

  return (
    <section
      className={styles.locationsSection}
      aria-label={t('businessDetail.locations.title')}
    >
      <h2 className={styles.title}>{t('businessDetail.locations.title')}</h2>
      <ul className={styles.locationsList} role="list">
        {locations.map((location) => (
          <li key={location.id} className={styles.locationItem}>
            <div className={styles.locationContent}>
              {location.name && <div className={styles.locationName}>{location.name}</div>}
              <address className={styles.address}>
                {location.addressLine1 && <div>{location.addressLine1}</div>}
                {location.addressLine2 && <div>{location.addressLine2}</div>}
                {(location.city || location.postalCode) && (
                  <div>
                    {location.postalCode && location.city
                      ? `${location.postalCode} ${location.city}`
                      : location.postalCode || location.city}
                  </div>
                )}
              </address>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
