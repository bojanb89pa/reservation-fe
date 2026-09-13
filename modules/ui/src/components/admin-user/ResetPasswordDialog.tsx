import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './ResetPasswordDialog.module.css';

// WARNING: BE only validates not-blank on the new password — this is a client-side-only
// minimum length convention, not a business rule sourced from the domain. Verify before merging.
const MIN_PASSWORD_LENGTH = 8;

interface Props {
  onConfirm: (newPassword: string) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
  error?: string | null;
}

export function ResetPasswordDialog({ onConfirm, onCancel, isPending, error }: Props) {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState(false);

  const tooShort = newPassword.length > 0 && newPassword.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit =
    newPassword.length >= MIN_PASSWORD_LENGTH && newPassword === confirmPassword && !isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    await onConfirm(newPassword);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <h3 className={styles.title}>{t('resetPasswordDialog.title')}</h3>
        {error && <div className="error-box">{error}</div>}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="form-field">
            <label className="form-label">{t('resetPasswordDialog.newPasswordLabel')}</label>
            <input
              type="password"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
              required
            />
            {touched && tooShort && (
              <div className="form-error">
                {t('resetPasswordDialog.errorTooShort', { minLength: MIN_PASSWORD_LENGTH })}
              </div>
            )}
          </div>
          <div className="form-field">
            <label className="form-label">{t('resetPasswordDialog.confirmPasswordLabel')}</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {touched && mismatch && (
              <div className="form-error">{t('resetPasswordDialog.errorMismatch')}</div>
            )}
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onCancel}
              disabled={isPending}
            >
              {t('resetPasswordDialog.cancel')}
            </button>
            <button type="submit" className="btn btn-secondary btn-sm" disabled={isPending}>
              {isPending ? t('resetPasswordDialog.saving') : t('resetPasswordDialog.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
