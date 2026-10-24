import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WIDGET_PROTOCOL_VERSION, WidgetMessageType } from '@fe/domain';
import type { WidgetUnavailableReason } from '@fe/domain';
import { resolveWidgetAvailability } from '@fe/application';
import '../../i18n';
import { QueryProvider } from '../../app/providers/QueryProvider';
import { useWidgetAppearance } from '../../hooks/useWidgetAppearance';
import { useWidgetBridge } from '../../hooks/useWidgetBridge';
import { useWidgetConfig } from '../../hooks/useWidgetConfig';
import { useWidgetParams } from '../../hooks/useWidgetParams';
import { useWidgetResize } from '../../hooks/useWidgetResize';
import { WidgetBooking } from './WidgetBooking';
import { WidgetWatermark } from './WidgetWatermark';
import styles from './WidgetApp.module.css';

function WidgetContent() {
  const { t } = useTranslation();
  const params = useWidgetParams();
  const rootRef = useRef<HTMLDivElement>(null);
  const [blockedReason, setBlockedReason] = useState<WidgetUnavailableReason | null>(null);

  const [theme, setTheme] = useState(params.theme);
  useWidgetAppearance(theme, params.locale);

  const hasParams = !!params.clientId && !!params.locationId;
  const { data: config, isLoading, isError } = useWidgetConfig(hasParams ? params.clientId : '');
  const { trusted, send, identityToken, requestIdentity, getIdentityTokenType } = useWidgetBridge({
    parentOrigin: params.parentOrigin,
    allowedOrigins: config?.allowedOrigins ?? null,
    onTheme: setTheme,
  });
  useWidgetResize(rootRef, send);

  const availability = useMemo(
    () => (config ? resolveWidgetAvailability(config, params.locationId) : null),
    [config, params.locationId],
  );
  const reason: WidgetUnavailableReason | null =
    blockedReason ?? (availability && !availability.available ? availability.reason : null);

  // The loader calls `onUnavailable({ reason })` for this message.
  useEffect(() => {
    if (reason) send({ v: WIDGET_PROTOCOL_VERSION, type: WidgetMessageType.UNAVAILABLE, reason });
  }, [reason, send]);

  const handleUnavailable = useCallback((r: WidgetUnavailableReason) => setBlockedReason(r), []);

  function renderBody() {
    if (!hasParams) return <Alert>{t('widget.missingParams')}</Alert>;
    if (isLoading)
      return (
        <p className={styles.message} role="status">
          {t('widget.loading')}
        </p>
      );
    if (isError || !config) return <Alert>{t('widget.loadError')}</Alert>;
    if (!trusted) return <Alert>{t('widget.originNotAllowed')}</Alert>;
    if (reason) return <Alert>{t(`widget.unavailable.${reason}`)}</Alert>;
    if (!availability?.available) return null;
    return (
      <WidgetBooking
        clientApplicationId={config.clientApplicationId}
        location={availability.location}
        identityToken={identityToken}
        requestIdentity={requestIdentity}
        getIdentityTokenType={getIdentityTokenType}
        send={send}
        onUnavailable={handleUnavailable}
      />
    );
  }

  return (
    <div ref={rootRef} className={styles.root}>
      {renderBody()}
      <WidgetWatermark />
    </div>
  );
}

function Alert({ children }: { children: string }) {
  return (
    <p className={styles.message} role="alert" data-testid="widget-alert">
      {children}
    </p>
  );
}

/** Root of the `/widget/` iframe app: booking UI without header or navigation. */
export function WidgetApp() {
  return (
    <QueryProvider>
      <WidgetContent />
    </QueryProvider>
  );
}
