import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { baseApi, useJoinByInviteMutation, useRegisterMutation } from '../../api/baseApi';
import { tokenStorage } from '../../api/client';
import { useAppDispatch } from '../../app/hooks';
import PasswordInput from '../../components/PasswordInput';
import { useT } from '../../i18n';

export default function RegisterPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [doRegister, { isLoading, error }] = useRegisterMutation();
  const [joinByInvite] = useJoinByInviteMutation();


  const nextPath = (location.state as { next?: string } | null)?.next;
  const inviteCode = nextPath?.startsWith('/invite/') ? nextPath.split('/').pop() : null;

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    try {
      const result = await doRegister(form).unwrap();
      tokenStorage.set(result.token);

      dispatch(baseApi.util.upsertQueryData('getMe', undefined, result.user));


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
          <h2>{t('auth.registerTitle')}</h2>
          <p className="subtitle">{t('auth.registerSubtitle')}</p>

          {errorMessage && <div className="error-banner">{errorMessage}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="username">{t('auth.username')}</label>
              <input
                id="username"
                className="input"
                value={form.username}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                placeholder={t('auth.usernamePlaceholder')}
                autoComplete="username"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="email">{t('auth.email')}</label>
              <input
                id="email"
                type="email"
                className="input"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder={t('auth.emailPlaceholder')}
                autoComplete="email"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">{t('auth.password')}</label>
              <PasswordInput
                id="password"
                value={form.password}
                onChange={(password) => setForm((prev) => ({ ...prev, password }))}
                placeholder={t('auth.passwordPlaceholder')}
                autoComplete="new-password"
                required
              />
            </div>
            <button type="submit" className="btn btn-accent" style={{ width: '100%' }} disabled={isLoading}>
              {isLoading ? t('auth.registerBtnBusy') : t('auth.registerBtn')}
            </button>
          </form>

          <div className="auth-divider">{t('auth.or')}</div>

          <Link to="/guest" className="btn" style={{ width: '100%' }}>
            {t('auth.tryGuest')}
          </Link>

          <p className="auth-switch">
            {t('auth.haveAccount')} <Link to="/login">{t('auth.switchToLogin')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
