import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  baseApi,
  useDeleteMeMutation,
  useGetAuthEventsQuery,
  useGetOAuthAccountsQuery,
  useGetWishlistsQuery,
  useSetPasswordMutation,
  useUnlinkOAuthMutation,
  useUpdateMeMutation,
  useUploadImageMutation,
} from '../../api/baseApi';
import { tokenStorage } from '../../api/client';
import { useAppDispatch, useAuthStatus } from '../../app/hooks';
import Avatar from '../../components/Avatar';
import Icon, { type IconName } from '../../components/Icon';
import PasswordInput from '../../components/PasswordInput';
import { useDialog } from '../../components/DialogProvider';
import { useT, type TranslationKey } from '../../i18n';
import { getApiErrorMessage } from '../../utils/api-error';
import OAuthButtons from './OAuthButtons';
import type { AuthEventType, OAuthProvider } from '../../types';

const EVENT_KEYS = {
  login: 'security.eventLogin',
  login_failed: 'security.eventLoginFailed',
  oauth_login: 'security.eventOAuthLogin',
  password_set: 'security.eventPasswordSet',
  token_reuse: 'security.eventTokenReuse',
} as const satisfies Record<AuthEventType, string>;

const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: 'Google',
  telegram: 'Telegram',
};

const AVATAR_COLORS = [
  '#5b7185',
  '#7c8b6f',
  '#c9762e',
  '#a4563f',
  '#8f6b8a',
  '#3f7a7a',
  '#94806e',
  '#6d5d8f',
];

type ProfileSection = 'profile' | 'account' | 'connections' | 'security' | 'danger';

const SECTIONS: ReadonlyArray<{ id: ProfileSection; label: TranslationKey; icon: IconName }> = [
  { id: 'profile', label: 'profile.sectionProfile', icon: 'user' },
  { id: 'account', label: 'profile.sectionAccount', icon: 'lock' },
  { id: 'connections', label: 'profile.sectionConnections', icon: 'link' },
  { id: 'security', label: 'profile.sectionSecurity', icon: 'clock' },
  { id: 'danger', label: 'profile.sectionDanger', icon: 'trash' },
];

export default function ProfilePage() {
  const { t, formatDate, formatDateTime } = useT();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { confirm, alert } = useDialog();
  const { user } = useAuthStatus();
  const { data: wishlists = [] } = useGetWishlistsQuery();
  const { data: oauthData } = useGetOAuthAccountsQuery();
  const { data: authEventsData } = useGetAuthEventsQuery();
  const [updateMe, { isLoading: savingProfile }] = useUpdateMeMutation();
  const [deleteMe, { isLoading: deletingAccount }] = useDeleteMeMutation();
  const [uploadImage, { isLoading: uploadingAvatar }] = useUploadImageMutation();
  const [unlinkOAuth] = useUnlinkOAuthMutation();
  const [setPassword, { isLoading: savingPassword }] = useSetPasswordMutation();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [section, setSection] = useState<ProfileSection>('profile');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [profileError, setProfileError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);
  const [oauthSaved, setOauthSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [deleteSecret, setDeleteSecret] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setUsername(user.username);
    setEmail(user.email);
  }, [user]);

  if (!user) return null;

  const totalWishes = wishlists.reduce((sum, wishlist) => sum + (wishlist.stats?.total ?? 0), 0);
  const totalPurchased = wishlists.reduce(
    (sum, wishlist) => sum + (wishlist.stats?.purchased ?? 0),
    0,
  );
  const memberSince = formatDate(user.createdAt);

  async function applyUpdate(
    patch: {
      displayName?: string;
      username?: string;
      email?: string;
      avatarColor?: string;
      avatarImage?: string | null;
    },
  ): Promise<boolean> {
    try {
      const updated = await updateMe(patch).unwrap();
      dispatch(baseApi.util.upsertQueryData('getMe', undefined, updated));
      return true;
    } catch {
      return false;
    }
  }

  async function handleProfileSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setProfileError('');
    setProfileSaved(false);
    const ok = await applyUpdate({ displayName: displayName.trim(), username: username.trim() });
    if (ok) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } else {
      setProfileError(t('profile.profileError'));
    }
  }

  async function handleEmailSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setEmailError('');
    setEmailSaved(false);
    const nextEmail = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(nextEmail)) {
      setEmailError(t('profile.emailInvalid'));
      return;
    }
    const ok = await applyUpdate({ email: nextEmail });
    if (ok) {
      setEmailSaved(true);
      setTimeout(() => setEmailSaved(false), 2500);
    } else {
      setEmailError(t('profile.profileError'));
    }
  }

  async function handleColor(color: string): Promise<void> {
    await applyUpdate({ avatarColor: color });
  }

  async function handleAvatarFile(file: File): Promise<void> {
    try {
      const { url } = await uploadImage(file).unwrap();
      await applyUpdate({ avatarImage: url });
    } catch {
      void 0;
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  }

  async function handleRemoveAvatar(): Promise<void> {
    await applyUpdate({ avatarImage: null });
  }

  async function handleUnlink(provider: OAuthProvider): Promise<void> {
    const ok = await confirm({ message: t('oauth.unlinkConfirm'), danger: true });
    if (!ok) return;
    try {
      await unlinkOAuth(provider).unwrap();
      setOauthSaved(false);
    } catch (error) {
      await alert(getApiErrorMessage(error, t('oauth.error')));
    }
  }

  async function handlePasswordSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setPasswordError('');
    setPasswordSaved(false);

    if (newPassword !== confirmPassword) {
      setPasswordError(t('profile.passwordMismatch'));
      return;
    }

    try {
      const result = await setPassword({
        currentPassword: user?.hasPassword ? currentPassword : undefined,
        newPassword,
      }).unwrap();
      tokenStorage.set(result.token);
      dispatch(baseApi.util.upsertQueryData('getMe', undefined, result.user));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (error) {
      setPasswordError(getApiErrorMessage(error, t('profile.passwordError')));
    }
  }

  async function handleDeleteAccount(event: FormEvent): Promise<void> {
    event.preventDefault();
    setDeleteError('');
    const ok = await confirm({
      title: t('profile.deleteConfirmTitle'),
      message: t('profile.deleteConfirm'),
      danger: true,
      confirmLabel: t('profile.deleteAction'),
    });
    if (!ok) return;

    try {
      await deleteMe(
        user?.hasPassword ? { password: deleteSecret } : { confirm: deleteSecret },
      ).unwrap();
      tokenStorage.clear();
      dispatch(baseApi.util.resetApiState());
      navigate('/');
    } catch (error) {
      setDeleteError(getApiErrorMessage(error, t('profile.deleteError')));
    }
  }

  return (
    <div className="container">
      <div className="profile-layout">
        <aside className="profile-nav">
          <div className="profile-nav-head">
            <Avatar
              name={user.displayName || user.username}
              color={user.avatarColor}
              image={user.avatarImage}
            />
            <div className="profile-nav-copy">
              <strong>{user.displayName || user.username}</strong>
              <span className="faint">@{user.username}</span>
            </div>
          </div>
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`profile-nav-item ${section === item.id ? 'is-active' : ''}`}
              onClick={() => setSection(item.id)}
            >
              <Icon name={item.icon} size={16} />
              {t(item.label)}
            </button>
          ))}
        </aside>

        <div className="profile-panel">
          {section === 'profile' && (
            <>
              <div className="profile-head">
                <Avatar
                  name={user.displayName || user.username}
                  color={user.avatarColor}
                  image={user.avatarImage}
                />
                <div>
                  <h1 className="profile-name">{user.displayName || user.username}</h1>
                  <div className="faint">@{user.username}</div>
                  <div className="faint">
                    {t('profile.memberSince')}: {memberSince}
                  </div>
                </div>
              </div>

              <div className="profile-stats">
                <div className="profile-stat">
                  <div className="profile-stat-value">{wishlists.length}</div>
                  <div className="profile-stat-label">
                    <Icon name="grid" size={13} />
                    {t('dashboard.title')}
                  </div>
                </div>
                <div className="profile-stat">
                  <div className="profile-stat-value">{totalWishes}</div>
                  <div className="profile-stat-label">
                    <Icon name="gift" size={13} />
                    {t('dashboard.totalWishes')}
                  </div>
                </div>
                <div className="profile-stat">
                  <div className="profile-stat-value">{totalPurchased}</div>
                  <div className="profile-stat-label">
                    <Icon name="check-circle" size={13} />
                    {t('dashboard.purchasedWishes')}
                  </div>
                </div>
              </div>

              <form className="profile-form" onSubmit={(event) => void handleProfileSubmit(event)}>
                <div className="field">
                  <label htmlFor="profile-display-name">{t('profile.displayName')}</label>
                  <input
                    id="profile-display-name"
                    className="input"
                    value={displayName}
                    maxLength={40}
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                  <p className="faint">{t('profile.displayNameHint')}</p>
                </div>
                <div className="field">
                  <label htmlFor="profile-username">{t('profile.username')}</label>
                  <input
                    id="profile-username"
                    className="input"
                    value={username}
                    maxLength={24}
                    onChange={(event) => setUsername(event.target.value)}
                  />
                  <p className="faint">{t('profile.usernameHint')}</p>
                </div>
                <button
                  type="submit"
                  className="btn btn-accent btn-sm"
                  disabled={savingProfile || !displayName.trim() || !username.trim()}
                >
                  {savingProfile ? t('common.saving') : t('profile.saveProfile')}
                </button>
                {profileError && <div className="error-banner">{profileError}</div>}
                {profileSaved && <div className="success-note">{t('profile.profileSaved')}</div>}
              </form>

              <section className="profile-section">
                <h3>
                  <Icon name="image" size={14} />
                  {t('profile.avatarImage')}
                </h3>
                <div className="profile-avatar-actions">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    style={{ display: 'none' }}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleAvatarFile(file);
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar || savingProfile}
                  >
                    <Icon name="upload" size={14} />
                    {uploadingAvatar ? t('profile.uploadingAvatar') : t('profile.uploadAvatar')}
                  </button>
                  {user.avatarImage && (
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => void handleRemoveAvatar()}
                      disabled={uploadingAvatar || savingProfile}
                    >
                      <Icon name="trash" size={14} />
                      {t('profile.removeAvatar')}
                    </button>
                  )}
                </div>
                <p className="faint">{t('form.uploadHint')}</p>
              </section>

              <section className="profile-section">
                <h3>
                  <Icon name="palette" size={14} />
                  {t('profile.avatarColor')}
                </h3>
                <div className="profile-colors">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      aria-label={color}
                      className={`profile-color ${user.avatarColor === color ? 'active' : ''}`}
                      style={{ background: color }}
                      onClick={() => void handleColor(color)}
                      disabled={savingProfile || uploadingAvatar}
                    />
                  ))}
                </div>
              </section>
            </>
          )}

          {section === 'account' && (
            <>
              <section className="profile-section">
                <h3>
                  <Icon name="user" size={14} />
                  {t('profile.emailChange')}
                </h3>
                <form className="profile-form" onSubmit={(event) => void handleEmailSubmit(event)}>
                  <div className="field">
                    <label htmlFor="profile-email">{t('profile.email')}</label>
                    <input
                      id="profile-email"
                      className="input"
                      type="email"
                      value={email}
                      placeholder={t('profile.emailPlaceholder')}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-accent btn-sm"
                    disabled={savingProfile || !email.trim()}
                  >
                    {savingProfile ? t('common.saving') : t('common.save')}
                  </button>
                  {emailError && <div className="error-banner">{emailError}</div>}
                  {emailSaved && <div className="success-note">{t('profile.saved')}</div>}
                </form>
              </section>

              <section className="profile-section">
                <h3>
                  <Icon name="lock" size={14} />
                  {user.hasPassword ? t('profile.changePassword') : t('profile.setPassword')}
                </h3>
                <p className="muted">
                  {user.hasPassword ? t('profile.changePasswordHint') : t('profile.setPasswordHint')}
                </p>
                <form
                  className="password-form"
                  onSubmit={(event) => void handlePasswordSubmit(event)}
                >
                  {user.hasPassword && (
                    <div className="field">
                      <label htmlFor="current-password">{t('profile.currentPassword')}</label>
                      <PasswordInput
                        id="current-password"
                        value={currentPassword}
                        onChange={setCurrentPassword}
                        autoComplete="current-password"
                        required
                      />
                    </div>
                  )}
                  <div className="field">
                    <label htmlFor="new-password">{t('profile.newPassword')}</label>
                    <PasswordInput
                      id="new-password"
                      value={newPassword}
                      onChange={setNewPassword}
                      placeholder={t('profile.passwordRules')}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="confirm-password">{t('profile.confirmPassword')}</label>
                    <PasswordInput
                      id="confirm-password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-accent btn-sm"
                    disabled={savingPassword || !newPassword || !confirmPassword}
                  >
                    {savingPassword ? t('profile.passwordSaving') : t('profile.passwordSave')}
                  </button>
                </form>
                {passwordError && <div className="error-banner">{passwordError}</div>}
                {passwordSaved && <div className="success-note">{t('profile.passwordSaved')}</div>}
              </section>
            </>
          )}

          {section === 'connections' && (
            <section className="profile-section">
              <h3>
                <Icon name="link" size={14} />
                {t('oauth.profileSection')}
              </h3>
              <p className="muted">{t('oauth.profileHint')}</p>
              <ul className="oauth-account-list">
                {(Object.keys(PROVIDER_LABELS) as OAuthProvider[]).map((provider) => {
                  const account = oauthData?.accounts.find((entry) => entry.provider === provider);
                  const available =
                    provider === 'telegram'
                      ? oauthData?.available.telegram.enabled
                      : oauthData?.available[provider];
                  return (
                    <li key={provider} className="oauth-account-row">
                      <span className={`oauth-badge oauth-badge-${provider}`}>
                        {PROVIDER_LABELS[provider]}
                      </span>
                      <span className="oauth-account-status">
                        {account
                          ? account.displayName || t('oauth.connected')
                          : available === false
                            ? t('oauth.unavailable')
                            : t('oauth.notConnected')}
                      </span>
                      {account && (
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => void handleUnlink(provider)}
                        >
                          {t('oauth.unlink')}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <OAuthButtons
                mode="link"
                connected={oauthData?.accounts.map((entry) => entry.provider) ?? []}
                onLinked={() => setOauthSaved(true)}
              />
              {oauthSaved && <div className="success-note">{t('oauth.linkSuccess')}</div>}
            </section>
          )}

          {section === 'security' && (
            <section className="profile-section">
              <h3>
                <Icon name="clock" size={14} />
                {t('security.title')}
              </h3>
              <p className="muted">{t('security.hint')}</p>
              {authEventsData && authEventsData.events.length > 0 ? (
                <ul className="security-log">
                  {authEventsData.events.map((entry) => (
                    <li key={entry.id} className="security-log-row">
                      <span className={`security-dot security-dot-${entry.event}`} aria-hidden />
                      <div>
                        <strong>{t(EVENT_KEYS[entry.event] ?? 'security.eventOther')}</strong>
                        <span className="faint">
                          {formatDateTime(entry.createdAt)}
                          {entry.ip ? ` · ${entry.ip}` : ''}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="faint">{t('security.empty')}</p>
              )}
            </section>
          )}

          {section === 'danger' && (
            <section className="profile-section profile-danger">
              <h3>
                <Icon name="trash" size={14} />
                {t('profile.deleteAccount')}
              </h3>
              <p className="muted">{t('profile.deleteHint')}</p>
              <form
                className="profile-form"
                onSubmit={(event) => void handleDeleteAccount(event)}
              >
                <div className="field">
                  <label htmlFor="delete-secret">
                    {user.hasPassword
                      ? t('profile.deletePassword')
                      : t('profile.deleteUsernameConfirm').replace('{username}', user.username)}
                  </label>
                  {user.hasPassword ? (
                    <PasswordInput
                      id="delete-secret"
                      value={deleteSecret}
                      onChange={setDeleteSecret}
                      autoComplete="off"
                      required
                    />
                  ) : (
                    <input
                      id="delete-secret"
                      className="input"
                      value={deleteSecret}
                      onChange={(event) => setDeleteSecret(event.target.value)}
                      autoComplete="off"
                      required
                    />
                  )}
                </div>
                <button
                  type="submit"
                  className="btn btn-danger btn-sm"
                  disabled={deletingAccount || !deleteSecret}
                >
                  <Icon name="trash" size={14} />
                  {deletingAccount ? t('common.saving') : t('profile.deleteAccount')}
                </button>
                {deleteError && <div className="error-banner">{deleteError}</div>}
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
