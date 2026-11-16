import { useEffect, useState } from 'react';
import Icon from './Icon';
import { useT } from '../i18n';

export default function OfflineIndicator() {
  const { t } = useT();
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && navigator.onLine === false,
  );

  useEffect(() => {
    const handleOnline = (): void => setOffline(false);
    const handleOffline = (): void => setOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="offline-indicator" role="status" aria-live="polite">
      <Icon name="alert" size={14} />
      <span>{t('offline.banner')}</span>
    </div>
  );
}
