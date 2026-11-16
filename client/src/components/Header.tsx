import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector, useAuthStatus, useLogout } from '../app/hooks';
import { toggleTheme } from '../features/ui/uiSlice';
import { useT, type Lang } from '../i18n';
import { CURRENCIES, setBaseCurrency, useCurrency, type Currency } from '../utils/currency';
import Avatar from './Avatar';
import BurgerMenu from './BurgerMenu';
import NotificationsBell from './NotificationsBell';


function CurrencySwitcher() {
  const { t } = useT();
  const { base } = useCurrency();

  return (
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
          <span className="logo-mark">🎁</span>
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
            {theme === 'dark' ? '☀️' : '🌙'}
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
                <span className="badge-dot" style={{ background: 'var(--peach)' }} />
                {t('header.guestBadge')}
              </span>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="btn btn-sm btn-ghost">
                {t('header.dashboard')}
              </Link>
              <Link
                to="/profile"
                className="header-user"
                title={t('header.profile')}
                aria-label={t('header.profile')}
              >
                <Avatar name={user.username} color={user.avatarColor} size="sm" image={user.avatarImage} />
                <span className="header-user-name">{user.username}</span>
              </Link>
              <button className="btn btn-sm btn-ghost" onClick={logout}>
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
