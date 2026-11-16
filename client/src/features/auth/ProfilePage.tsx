import { useRef, useState } from 'react';
import {
  baseApi,
  useGetWishlistsQuery,
  useUpdateMeMutation,
  useUploadImageMutation,
} from '../../api/baseApi';
import { useAppDispatch, useAuthStatus } from '../../app/hooks';
import Avatar from '../../components/Avatar';
import { useT } from '../../i18n';

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


export default function ProfilePage() {
  const { t } = useT();
  const dispatch = useAppDispatch();
  const { user } = useAuthStatus();
  const { data: wishlists = [] } = useGetWishlistsQuery();
  const [updateMe] = useUpdateMeMutation();
  const [uploadImage, { isLoading: uploadingAvatar }] = useUploadImageMutation();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  const totalWishes = wishlists.reduce((sum, wishlist) => sum + (wishlist.stats?.total ?? 0), 0);
  const totalPurchased = wishlists.reduce(
    (sum, wishlist) => sum + (wishlist.stats?.purchased ?? 0),
    0,
  );
  const memberSince = new Date(user.createdAt).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  async function handleColor(color: string): Promise<void> {
    try {
      const updated = await updateMe({ avatarColor: color }).unwrap();
      dispatch(baseApi.util.upsertQueryData('getMe', undefined, updated));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      void 0;
    }
  }

  async function handleAvatarFile(file: File): Promise<void> {
    try {
      const { url } = await uploadImage(file).unwrap();
      const updated = await updateMe({ avatarImage: url }).unwrap();
      dispatch(baseApi.util.upsertQueryData('getMe', undefined, updated));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      void 0;
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  }

  async function handleRemoveAvatar(): Promise<void> {
    try {
      const updated = await updateMe({ avatarImage: null }).unwrap();
      dispatch(baseApi.util.upsertQueryData('getMe', undefined, updated));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      void 0;
    }
  }

  return (
    <div className="container">
      <div className="profile-card">
        <div className="profile-head">
          <Avatar name={user.username} color={user.avatarColor} image={user.avatarImage} />
          <div>
            <h1 className="profile-name">{user.username}</h1>
            <div className="faint">
              {t('profile.memberSince')}: {memberSince}
            </div>
          </div>
        </div>

        <div className="profile-stats">
          <div className="profile-stat">
            <div className="profile-stat-value">{wishlists.length}</div>
            <div className="profile-stat-label">{t('dashboard.title')}</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-value">{totalWishes}</div>
            <div className="profile-stat-label">{t('dashboard.totalWishes')}</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-value">{totalPurchased}</div>
            <div className="profile-stat-label">{t('dashboard.purchasedWishes')}</div>
          </div>
        </div>

        <section className="profile-section">
          <h3>{t('profile.email')}</h3>
          <p className="muted">{user.email}</p>
        </section>

        <section className="profile-section">
          <h3>{t('profile.avatarImage')}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? t('profile.uploadingAvatar') : `📁 ${t('profile.uploadAvatar')}`}
            </button>
            {user.avatarImage && (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => void handleRemoveAvatar()}
              >
                {t('profile.removeAvatar')}
              </button>
            )}
          </div>
          <p className="faint">{t('form.uploadHint')}</p>
          {saved && <div className="success-note">{t('profile.saved')}</div>}
        </section>

        <section className="profile-section">
          <h3>{t('profile.avatarColor')}</h3>
          <div className="profile-colors">
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                aria-label={color}
                className={`profile-color ${user.avatarColor === color ? 'active' : ''}`}
                style={{ background: color }}
                onClick={() => void handleColor(color)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
