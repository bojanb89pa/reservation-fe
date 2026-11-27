import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tokenStorage } from '../../app/container';

/**
 * Shows a one-time notice after a forced re-login. The flag is consumed on first mount
 * (the ref guards against the StrictMode double effect), so later renders never repeat it.
 */
export function SessionExpiredNotice() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const consumed = useRef(false);

  useEffect(() => {
    if (consumed.current) return;
    consumed.current = true;
    if (tokenStorage.consumeSessionExpiredFlag()) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="error-box" role="status" style={{ margin: 0, textAlign: 'center' }}>
      {t('sessionExpired.notice')}{' '}
      <button type="button" onClick={() => setVisible(false)}>
        {t('sessionExpired.dismiss')}
      </button>
    </div>
  );
}
