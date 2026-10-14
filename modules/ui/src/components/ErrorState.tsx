import { useTranslation } from 'react-i18next';

interface Props {
  message: string;
  onRetry: () => unknown;
  isRetrying?: boolean;
}

export function ErrorState({ message, onRetry, isRetrying = false }: Props) {
  const { t } = useTranslation();
  return (
    <div className="error-box" role="alert" data-testid="load-error">
      <p>{message}</p>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => void onRetry()}
        disabled={isRetrying}
        data-testid="load-error-retry"
      >
        {isRetrying ? t('common.retrying') : t('common.retry')}
      </button>
    </div>
  );
}
