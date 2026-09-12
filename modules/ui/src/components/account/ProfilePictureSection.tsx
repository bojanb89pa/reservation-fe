import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { User } from '@domain';
import { PROFILE_PICTURE_UPLOAD_TYPE } from '@domain';
import { Avatar } from '../Avatar';
import { ProfilePicturePicker } from './ProfilePicturePicker';
import { useUploadFile } from '../../hooks/useFileUpload';
import { useSetProfilePicture, useDeleteProfilePicture } from '../../hooks/useProfilePicture';
import { useProfilePictureMessages } from '../../hooks/useProfilePictureMessages';
import styles from './ProfilePictureSection.module.css';

interface Props {
  user: User;
}

/**
 * Replacing the picture is the same two-phase flow as a business image: park
 * the file first, then claim the returned `uploadId` with a JSON request.
 */
export function ProfilePictureSection({ user }: Props) {
  const { t } = useTranslation();
  const { uploadErrorMessage } = useProfilePictureMessages();

  const { mutateAsync: uploadFile, isPending: uploading } = useUploadFile(
    PROFILE_PICTURE_UPLOAD_TYPE,
  );
  const { mutateAsync: setPicture, isPending: saving } = useSetProfilePicture();
  const { mutateAsync: removePicture, isPending: removing } = useDeleteProfilePicture();

  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isBusy = uploading || saving || removing;

  const handleReplace = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;
    setError(null);
    try {
      const pendingUpload = await uploadFile(file);
      await setPicture(pendingUpload.uploadId);
      setFile(null);
    } catch (err: unknown) {
      setError(uploadErrorMessage(err) ?? t('profilePicture.errorGeneric'));
    }
  };

  const handleRemove = async () => {
    setError(null);
    try {
      await removePicture();
    } catch (err: unknown) {
      setError(uploadErrorMessage(err) ?? t('profilePicture.errorGeneric'));
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{t('profilePicture.sectionTitle')}</h2>
        <span className={styles.sectionMeta}>
          {user.profilePictureUrl
            ? t('profilePicture.statusSet')
            : t('profilePicture.statusEmpty')}
        </span>
      </div>

      <div className={styles.layout}>
        <div className={styles.current}>
          <Avatar
            firstName={user.firstName}
            lastName={user.lastName}
            profilePictureUrl={user.profilePictureUrl}
            size={96}
          />
        </div>

        <form onSubmit={handleReplace} className={styles.form}>
          <ProfilePicturePicker file={file} onChange={setFile} disabled={isBusy} />
          <div className={styles.actions}>
            <button type="submit" className="btn btn-secondary" disabled={isBusy || !file}>
              {uploading || saving
                ? t('profilePicture.saving')
                : user.profilePictureUrl
                  ? t('profilePicture.replace')
                  : t('profilePicture.upload')}
            </button>
            {user.profilePictureUrl && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleRemove}
                disabled={isBusy}
              >
                {removing ? t('profilePicture.removing') : t('profilePicture.remove')}
              </button>
            )}
          </div>
        </form>
      </div>

      {error && <div className={styles.error}>{error}</div>}
    </section>
  );
}
