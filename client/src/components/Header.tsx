import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector, useAuthStatus, useLogout } from '../app/hooks';
import { toggleTheme } from '../features/ui/uiSlice';
import CurrencyRatesModal from '../features/settings/CurrencyRatesModal';
import { useT, type Lang } from '../i18n';
import { CURRENCIES, setBaseCurrency, useCurrency, type Currency } from '../utils/currency';
import Avatar from './Avatar';
import BurgerMenu from './BurgerMenu';
import Icon from './Icon';
import NotificationsBell from './NotificationsBell';


function CurrencySwitcher() {
  const { t } = useT();
  const { base } = useCurrency();
  const [ratesOpen, setRatesOpen] = useState(false);

  return (
    <>
      <div className="currency-switch-group">
        <select
          className="currency-switch"
          value={base}
          onChange={(event) => setBaseCurrency(event.target.value as Currency)}
          aria-label={t('currency.label')}
          title={t('currency.hint')}
        >
          {CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-sm btn-ghost currency-rates-btn"
          onClick={() => setRatesOpen(true)}
          aria-label={t('currencyRates.open')}
          title={t('currencyRates.open')}
        >
          <Icon name="settings" size={14} />
        </button>
      </div>
      {ratesOpen && <CurrencyRatesModal onClose={() => setRatesOpen(false)} />}
    </>
  );
}

function LanguageSwitcher() {
  const { lang, setLang } = useT();
  const options: ReadonlyArray<{ value: Lang; label: string }> = [
    { value: 'ru', label: 'RU' },
    { value: 'en', label: 'EN' },
  ];

  return (
    <div className="lang-switch" role="group" aria-label="Language">
      {options.map((option) => (
        <button
          key={option.value}
          className={lang === option.value ? 'active' : ''}
          onClick={() => setLang(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface HeaderProps {

  guestMode?: boolean;

  publicMode?: boolean;
}

export default function Header({ guestMode = false, publicMode = false }: HeaderProps) {
  const { t } = useT();
  const { user } = useAuthStatus();
  const logout = useLogout();
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.ui.theme);

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to={guestMode ? '/guest' : publicMode ? '/' : '/dashboard'} className="logo">
          <span className="logo-mark">
            <Icon name="gift" size={18} />
          </span>
          Wishlist
        </Link>

        <div className="header-actions">
          <LanguageSwitcher />

          <button
            className="btn btn-icon theme-toggle"
            onClick={() => dispatch(toggleTheme())}
            aria-label={t('common.toggleTheme')}
            title={t('common.toggleTheme')}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
          </button>

          {!publicMode && !guestMode && user && <NotificationsBell />}

          {!publicMode && <CurrencySwitcher />}

          {publicMode ? (
            <Link to="/register" className="btn btn-sm btn-accent">
              {t('header.createOwn')}
            </Link>
          ) : guestMode || !user ? (
            <>
              <Link to="/" className="btn btn-sm">
                {t('header.login')}
              </Link>
              <span className="badge">
                <Icon name="sparkles" size={13} />
                {t('header.guestBadge')}
              </span>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="btn btn-sm btn-ghost">
                <Icon name="grid" size={15} />
                {t('header.dashboard')}
              </Link>
              <Link
                to="/profile"
                className="header-user"
                title={t('header.profile')}
                aria-label={t('header.profile')}
              >
                <Avatar
                  name={user.displayName || user.username}
                  color={user.avatarColor}
                  size="sm"
                  image={user.avatarImage}
                />
                <span className="header-user-name">{user.displayName || user.username}</span>
              </Link>
              <button className="btn btn-sm btn-ghost" onClick={logout}>
                <Icon name="logout" size={15} />
                {t('header.logout')}
              </button>
            </>
          )}

          <div className="burger-only">
            <BurgerMenu guestMode={guestMode} />
          </div>
        </div>
      </div>
    </header>
  );
}
