import { Link, useNavigate, useParams } from 'react-router-dom';
import { useGetInviteInfoQuery, useJoinByInviteMutation } from '../../api/baseApi';
import { useAuthStatus } from '../../app/hooks';
import Avatar from '../../components/Avatar';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import { useT } from '../../i18n';


export default function InviteLandingPage() {
  const { code } = useParams<{ code: string }>();
  const { t } = useT();
  const navigate = useNavigate();
  const { status } = useAuthStatus();
  const { data: info, isLoading, isError } = useGetInviteInfoQuery(code ?? '', { skip: !code });
  const [joinByInvite, { isLoading: joining }] = useJoinByInviteMutation();

  async function handleJoin(): Promise<void> {
    if (!code) return;
    try {
      const result = await joinByInvite(code).unwrap();
      navigate(`/wishlist/${result.wishlistId}`);
    } catch (error) {
      const message =
        typeof error === 'object' && error !== null && 'data' in error
          ? String((error.data as { message?: string }).message ?? '')
          : '';
      if (message) alert(message);
    }
  }

  return (
    <div className="page">
      <Header publicMode />

      <main className="main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="invite-card">
          {isLoading && <div className="spinner" />}

          {isError && (
            <div className="empty-state">
              <div className="empty-icon">🔒</div>
              <h3>{t('inviteLanding.notFound')}</h3>
              <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>
                {t('common.backHome')}
              </Link>
            </div>
          )}

          {info && (
            <>
              <div className="invite-hero-badge">{t('inviteLanding.badge')}</div>
              <h1 className="invite-title">
                {t('inviteLanding.title')} «{info.name}»
              </h1>
              <div className="invite-owner">
                <Avatar name={info.owner.username} color={info.owner.avatarColor} />
                <span>
                  {t('inviteLanding.owner')} <b>{info.owner.username}</b>
                </span>
              </div>

              {status === 'authenticated' ? (
                <>
                  <p className="muted" style={{ margin: '18px 0' }}>
                    {t('inviteLanding.alreadyAuthed')}
                  </p>
                  <button className="btn btn-accent" onClick={handleJoin} disabled={joining}>
                    {joining ? t('common.loading') : t('inviteLanding.join')}
                  </button>
                </>
              ) : (
                <>
                  <p className="muted" style={{ margin: '18px 0' }}>
                    {t('inviteLanding.needAccount')}
                  </p>
                  <div className="invite-actions">
                    <Link
                      to="/register"
                      state={{ next: `/invite/${code}` }}
                      className="btn btn-accent"
                    >
                      {t('inviteLanding.registerAndJoin')}
                    </Link>
                    <Link to="/login" state={{ next: `/invite/${code}` }} className="btn">
                      {t('header.login')}
                    </Link>
                  </div>
                  <p className="faint" style={{ marginTop: 14 }}>
                    {t('inviteLanding.afterJoinHint')}
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
