import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { useJoinByInviteMutation, useLoginMutation } from '../../api/baseApi';
import { tokenStorage } from '../../api/client';
import PasswordInput from '../../components/PasswordInput';
import { useT } from '../../i18n';

export default function LoginPage() {
  const { t } = useT();
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
        <Link to="/" className="logo">
          <span className="logo-mark">🎁</span>
          Wishlist
        </Link>
        <div className="auth-side-content">
          <h2>{t('auth.heroTitle')}</h2>
          <p>{t('auth.heroText')}</p>
          <ul className="auth-points">
            <li>
              <span className="point-dot">✓</span>
              {t('auth.heroPoint1')}
            </li>
            <li>
              <span className="point-dot">🛒</span>
              {t('auth.heroPoint2')}
            </li>
            <li>
              <span className="point-dot">👥</span>
              {t('auth.heroPoint3')}
            </li>
          </ul>
        </div>
      </aside>

      <div className="auth-form-col">
        <div className="auth-card">
          <h2>{t('auth.loginTitle')}</h2>
          <p className="subtitle">{t('auth.loginSubtitle')}</p>

          {errorMessage && <div className="error-banner">{errorMessage}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="login">{t('auth.loginOrEmail')}</label>
              <input
                id="login"
                className="input"
                value={credentials.login}
                onChange={(event) => setCredentials((prev) => ({ ...prev, login: event.target.value }))}
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
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isLoading}>
              {isLoading ? t('auth.loginBtnBusy') : t('auth.loginBtn')}
            </button>
          </form>

          <div className="auth-divider">{t('auth.or')}</div>

          <Link to="/guest" className="btn" style={{ width: '100%' }}>
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
