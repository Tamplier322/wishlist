import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { enablePush } from '../api/push-client';
import { useAppDispatch, useAppSelector, useLogout } from '../app/hooks';
import { toggleTheme } from '../features/ui/uiSlice';
import { useT } from '../i18n';
import { CURRENCIES, setBaseCurrency, useCurrency } from '../utils/currency';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(event: BeforeInstallPromptEvent | null) => void>();

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  listeners.forEach((listener) => listener(deferredPrompt));
});


export default function BurgerMenu({ guestMode = false }: { guestMode?: boolean }) {
  const { t, lang, setLang } = useT();
  const { base } = useCurrency();
  const dispatch = useAppDispatch();
  const logout = useLogout();
  const theme = useAppSelector((state) => state.ui.theme);
  const [open, setOpen] = useState(false);
  const [canInstall, setCanInstall] = useState(deferredPrompt !== null);
  const [pushState, setPushState] = useState<'idle' | 'on'>('idle');

  useEffect(() => {
    const listener = (event: BeforeInstallPromptEvent | null): void => {
      setCanInstall(event !== null);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  async function handleInstall(): Promise<void> {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    deferredPrompt = null;
    setCanInstall(false);
    setOpen(false);
  }

  async function handlePush(): Promise<void> {
    const enabled = await enablePush();
    if (enabled) setPushState('on');
  }

  return (
    <div className="burger-wrap">
      <button className="burger-btn" aria-label="Menu" onClick={() => setOpen((prev) => !prev)}>
        <Icon name="menu" size={18} />
      </button>

      {open &&
        createPortal(
          <>
            <div className="burger-overlay" onClick={() => setOpen(false)} />
            <nav className="burger-panel">
              <div className="burger-panel-header">
                <span className="logo">
                  <span className="logo-mark">
                    <Icon name="gift" size={16} />
                  </span>
                  Wishlist
                </span>
                <button className="modal-close" onClick={() => setOpen(false)} aria-label={t('common.close')}>
                  <Icon name="close" size={16} />
                </button>
              </div>

              {!guestMode && (
                <Link className="burger-item" to="/profile" onClick={() => setOpen(false)}>
                  <Icon name="user" size={17} />
                  {t('profile.title')}
                </Link>
              )}

              <button className="burger-item" onClick={() => dispatch(toggleTheme())}>
                <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
                {t('common.toggleTheme')}
              </button>

              <div className="burger-row">
                {(['ru', 'en'] as const).map((code) => (
                  <button
                    key={code}
                    className={`burger-lang ${lang === code ? 'active' : ''}`}
                    onClick={() => setLang(code)}
                  >
                    {code.toUpperCase()}
                  </button>
                ))}
              </div>

              <div
                className="burger-row"
                role="group"
                aria-label={t('currency.label')}
                title={t('currency.hint')}
              >
                {CURRENCIES.map((currency) => (
                  <button
                    key={currency}
                    className={`burger-lang ${base === currency ? 'active' : ''}`}
                    onClick={() => setBaseCurrency(currency)}
                  >
                    {currency}
                  </button>
                ))}
              </div>

              {!guestMode && (
                <button className="burger-item" onClick={() => void handlePush()}>
                  <Icon name="bell" size={17} />
                  {t('notifications.enablePush')}
                  {pushState === 'on' && <Icon name="check" size={15} className="burger-extra" />}
                </button>
              )}

              {canInstall && (
                <button className="burger-item" onClick={() => void handleInstall()}>
                  <Icon name="download" size={17} />
                  {t('burger.install')}
                </button>
              )}

              <div className="burger-separator" />

              {!guestMode && (
                <button className="burger-item" onClick={logout}>
                  <Icon name="logout" size={17} />
                  {t('header.logout')}
                </button>
              )}
            </nav>
          </>,
          document.body,
        )}
    </div>
  );
}
