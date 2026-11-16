import { useEffect, useState } from 'react';
import Icon from './Icon';
import { useT } from '../i18n';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

let installEvent: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(event: BeforeInstallPromptEvent | null) => void>();

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installEvent = event as BeforeInstallPromptEvent;
  listeners.forEach((listener) => listener(installEvent));
});

export function isInstallAvailable(): boolean {
  return installEvent !== null;
}

export function onInstallAvailability(listener: (available: boolean) => void): () => void {
  const wrapped = (event: BeforeInstallPromptEvent | null): void => listener(event !== null);
  listeners.add(wrapped);
  listener(installEvent !== null);
  return () => {
    listeners.delete(wrapped);
  };
}


export default function InstallPwaButton() {
  const { t } = useT();
  const [canInstall, setCanInstall] = useState(installEvent !== null);

  useEffect(() => {
    const listener = (event: BeforeInstallPromptEvent | null): void => {
      setCanInstall(event !== null);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (!canInstall) return null;

  return (
    <button
      className="btn btn-sm btn-accent"
      style={{ width: '100%' }}
      onClick={() => {
        void installEvent?.prompt().then(() => {
          installEvent = null;
          setCanInstall(false);
        });
      }}
    >
      <Icon name="download" size={14} />
      {t('pwa.install')}
    </button>
  );
}
