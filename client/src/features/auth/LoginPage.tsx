import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { useJoinByInviteMutation, useLoginMutation } from '../../api/baseApi';
import { tokenStorage } from '../../api/client';
import { useAppDispatch } from '../../app/hooks';
import { mergeGuestWishlist } from '../guest/mergeGuest';
import { pushEvent } from '../notifications/notificationsSlice';
import Icon from '../../components/Icon';
import PasswordInput from '../../components/PasswordInput';
import AuthArt from './AuthArt';
import OAuthButtons from './OAuthButtons';
import { useT } from '../../i18n';

export default function LoginPage() {
  const { t } = useT();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [credentials, setCredentials] = useState({ login: '', password: '' });
  const [doLogin, { isLoading, error }] = useLoginMutation();
  const [joinByInvite] = useJoinByInviteMutation();

  const nextPath = (location.state as { next?: string } | null)?.next;
  const inviteCode = nextPath?.startsWith('/invite/') ? nextPath.split('/').pop() : null;

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    try {
      const result = await doLogin(credentials).unwrap();
      tokenStorage.set(result.token);

      const moved = await mergeGuestWishlist(dispatch);
      if (moved > 0) {
        dispatch(pushEvent({ text: t('guest.merged', { count: moved }), kind: 'success' }));
      }

      if (inviteCode) {
        const joined = await joinByInvite(inviteCode).unwrap();
        navigate(`/wishlist/${joined.wishlistId}`);
        return;
      }

      navigate(nextPath ?? '/dashboard');
    } catch {
      void 0;
    }
  }

  const errorMessage =
    error && typeof error === 'object' && 'data' in error
      ? String((error.data as { message?: string }).message ?? '')
      : null;

  return (
    <div className="auth-page">
      <aside className="auth-side">
        <AuthArt />
        <Link to="/" className="logo">
          <span className="logo-mark">
            <Icon name="gift" size={18} />
          </span>
          Wishlist
        </Link>
        <div className="auth-side-content">
          <h2>{t('auth.heroTitle')}</h2>
          <p>{t('auth.heroText')}</p>
          <ul className="auth-points">
            <li>
              <span className="point-dot">
                <Icon name="check" size={13} />
              </span>
              {t('auth.heroPoint1')}
            </li>
            <li>
              <span className="point-dot">
                <Icon name="cart" size={13} />
              </span>
              {t('auth.heroPoint2')}
            </li>
            <li>
              <span className="point-dot">
                <Icon name="users" size={13} />
              </span>
              {t('auth.heroPoint3')}
            </li>
          </ul>
        </div>
      </aside>

      <div className="auth-form-col">
        <div className="auth-card">
          <h2>{t('auth.loginTitle')}</h2>
          <p className="subtitle">{t('auth.loginSubtitle')}</p>

          {errorMessage && (
            <div className="error-banner" role="alert" aria-live="assertive">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="login">{t('auth.loginOrEmail')}</label>
              <input
                id="login"
                className="input"
                value={credentials.login}
                onChange={(event) =>
                  setCredentials((prev) => ({ ...prev, login: event.target.value }))
                }
                placeholder={t('auth.loginOrEmailPlaceholder')}
                autoComplete="username"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">{t('auth.password')}</label>
              <PasswordInput
                id="password"
                value={credentials.password}
                onChange={(password) => setCredentials((prev) => ({ ...prev, password }))}
                placeholder={t('auth.passwordPlaceholder')}
                autoComplete="current-password"
                required
              />
            </div>
            <button type="submit" className="oauth-btn auth-submit" disabled={isLoading}>
              <svg className="auth-submit-icon" viewBox="0 0 24 24" aria-hidden focusable="false">
                <path
                  fill="currentColor"
                  d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5-8-5V6l8 5 8-5v2Z"
                />
              </svg>
              {isLoading ? t('auth.loginBtnBusy') : t('auth.loginBtn')}
            </button>
          </form>

          <OAuthButtons next={nextPath ?? '/dashboard'} />

          <div className="auth-divider">{t('auth.or')}</div>

          <Link to="/guest" className="btn" style={{ width: '100%' }}>
            <Icon name="sparkles" size={15} />
            {t('auth.tryGuest')}
          </Link>

          <p className="auth-switch">
            {t('auth.noAccount')} <Link to="/register">{t('auth.switchToRegister')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
