import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  baseApi,
  useGetMeQuery,
  useUpdateMeMutation,
  useUploadImageMutation,
} from '../../api/baseApi';
import { useAppDispatch } from '../../app/hooks';
import Avatar from '../../components/Avatar';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import { useT } from '../../i18n';
import { getApiErrorMessage } from '../../utils/api-error';

const DISMISS_KEY = 'wishlist:profile-setup-dismissed';

export default function ProfileSetupModal() {
  const { t } = useT();
  const dispatch = useAppDispatch();
  const { data: user } = useGetMeQuery();
  const [updateMe, { isLoading: saving }] = useUpdateMeMutation();
  const [uploadImage, { isLoading: uploading }] = useUploadImageMutation();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    if (!user.email.endsWith('@oauth.local')) return;
    if (localStorage.getItem(`${DISMISS_KEY}:${user.id}`) === '1') return;
    setDisplayName(user.displayName || user.username);
    setEmail('');
    setAvatarImage(user.avatarImage);
    setOpen(true);
  }, [user]);

  if (!open || !user) return null;

  function dismiss(): void {
    if (user) localStorage.setItem(`${DISMISS_KEY}:${user.id}`, '1');
    setOpen(false);
  }

  async function handleAvatarFile(file: File): Promise<void> {
    try {
      const { url } = await uploadImage(file).unwrap();
      setAvatarImage(url);
    } catch {
      void 0;
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!user) return;
    setError('');
    const nextEmail = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(nextEmail)) {
      setError(t('profile.emailInvalid'));
      return;
    }

    try {
      const updated = await updateMe({
        displayName: displayName.trim(),
        email: nextEmail,
        avatarImage,
      }).unwrap();
      dispatch(baseApi.util.upsertQueryData('getMe', undefined, updated));
      localStorage.setItem(`${DISMISS_KEY}:${user.id}`, '1');
      setOpen(false);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, t('profile.profileError')));
    }
  }

  return (
    <Modal title={t('profile.setupTitle')} onClose={dismiss} busy={saving}>
      <p className="muted">{t('profile.setupHint')}</p>
      <form className="profile-setup-form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="profile-setup-avatar">
          <Avatar
            name={displayName || user.username}
            color={user.avatarColor}
            image={avatarImage}
          />
          <div className="profile-setup-avatar-actions">
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
              disabled={uploading || saving}
            >
              <Icon name="upload" size={14} />
              {uploading ? t('profile.uploadingAvatar') : t('profile.uploadAvatar')}
            </button>
            {avatarImage && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setAvatarImage(null)}
                disabled={uploading || saving}
              >
                <Icon name="trash" size={14} />
                {t('profile.removeAvatar')}
              </button>
            )}
          </div>
        </div>

        <div className="field">
          <label htmlFor="setup-display-name">{t('profile.displayName')}</label>
          <input
            id="setup-display-name"
            className="input"
            value={displayName}
            maxLength={40}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="setup-email">{t('profile.emailChange')}</label>
          <input
            id="setup-email"
            className="input"
            type="email"
            value={email}
            placeholder={t('profile.emailPlaceholder')}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={dismiss}>
            {t('common.later')}
          </button>
          <button
            type="submit"
            className="btn btn-accent"
            disabled={saving || !displayName.trim() || !email.trim()}
          >
            {saving ? t('common.saving') : t('profile.setupSave')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
