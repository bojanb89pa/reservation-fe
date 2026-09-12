import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfilePictureMessages } from '../../hooks/useProfilePictureMessages';
import styles from './ProfilePicturePicker.module.css';

interface Props {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

/**
 * Picks a single image and previews it locally before anything is sent.
 * The file is never validated here — `UploadFileUseCase` decides and answers
 * with a `FileUploadError`; the constants below only shape the hint and `accept`.
 */
export function ProfilePicturePicker({ file, onChange, disabled = false }: Props) {
  const { t } = useTranslation();
  const { accept, limitHint } = useProfilePictureMessages();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.files?.[0] ?? null);
  };

  const handleClear = () => {
    // Clearing the input matters: without it, re-picking the same file fires no change event.
    if (inputRef.current) inputRef.current.value = '';
    onChange(null);
  };

  return (
    <div className={styles.picker}>
      <label className="form-label" htmlFor={inputId}>
        {t('profilePicture.pickerLabel')}
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        className={styles.input}
        onChange={handleSelect}
        disabled={disabled}
      />

      {previewUrl && (
        <div className={styles.preview}>
          <img
            className={styles.previewImage}
            src={previewUrl}
            alt={t('profilePicture.previewAlt')}
          />
          <div className={styles.previewInfo}>
            <span className={styles.fileName}>{file?.name}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleClear}
              disabled={disabled}
            >
              {t('profilePicture.clear')}
            </button>
          </div>
        </div>
      )}

      <p className={styles.hint}>{limitHint}</p>
    </div>
  );
}
