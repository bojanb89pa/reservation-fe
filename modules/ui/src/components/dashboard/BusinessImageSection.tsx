import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Business } from '@domain';
import { BusinessImage } from '../business/BusinessImage';
import { BusinessImagePicker } from '../business/BusinessImagePicker';
import { useUploadFile } from '../../hooks/useFileUpload';
import { useSetBusinessImage, useRemoveBusinessImage } from '../../hooks/useBusinesses';
import { useBusinessImageMessages } from '../../hooks/useBusinessImageMessages';
import styles from './BusinessImageSection.module.css';

interface Props {
  business: Business;
}

/**
 * Replacing an image is the same two-phase flow as creating a business:
 * park the file first, then claim the returned `uploadId` with a JSON request.
 */
export function BusinessImageSection({ business }: Props) {
  const { t } = useTranslation();
  const { uploadErrorMessage } = useBusinessImageMessages();
  const businessId = business.id ?? '';

  const { mutateAsync: uploadFile, isPending: uploading } = useUploadFile();
  const { mutateAsync: setImage, isPending: saving } = useSetBusinessImage(businessId);
  const { mutateAsync: removeImage, isPending: removing } = useRemoveBusinessImage(businessId);

  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isBusy = uploading || saving || removing;

  const handleReplace = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;
    setError(null);
    try {
      const pendingUpload = await uploadFile(file);
      await setImage(pendingUpload.uploadId);
      setFile(null);
    } catch (err: unknown) {
      setError(uploadErrorMessage(err) ?? t('businessImage.errorGeneric'));
    }
  };

  const handleRemove = async () => {
    setError(null);
    try {
      await removeImage();
    } catch (err: unknown) {
      setError(uploadErrorMessage(err) ?? t('businessImage.errorGeneric'));
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{t('businessImage.sectionTitle')}</h2>
        <span className={styles.sectionMeta}>
          {business.imageUrl ? t('businessImage.statusSet') : t('businessImage.statusEmpty')}
        </span>
      </div>

      <div className={styles.layout}>
        {/* WARNING: assumed a replaced image is served fresh on the same path — verify before merging */}
        <div className={styles.current}>
          <BusinessImage
            name={business.name}
            imageUrl={business.imageUrl}
            seed={business.id}
            variant="card"
          />
        </div>

        <form onSubmit={handleReplace} className={styles.form}>
          <BusinessImagePicker file={file} onChange={setFile} disabled={isBusy} />
          <div className={styles.actions}>
            <button type="submit" className="btn btn-secondary" disabled={isBusy || !file}>
              {uploading || saving
                ? t('businessImage.saving')
                : business.imageUrl
                  ? t('businessImage.replace')
                  : t('businessImage.upload')}
            </button>
            {business.imageUrl && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleRemove}
                disabled={isBusy}
              >
                {removing ? t('businessImage.removing') : t('businessImage.remove')}
              </button>
            )}
          </div>
        </form>
      </div>

      {error && <div className={styles.error}>{error}</div>}
    </section>
  );
}
