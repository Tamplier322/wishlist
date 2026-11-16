import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { baseApi, useExchangeOAuthMutation } from '../../api/baseApi';
import { tokenStorage } from '../../api/client';
import { useAppDispatch } from '../../app/hooks';
import { mergeGuestWishlist } from '../guest/mergeGuest';
import { pushEvent } from '../notifications/notificationsSlice';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import { useT } from '../../i18n';

function errorMessageKey(code: string): string {
  switch (code) {
    case 'OAUTH_EMAIL_EXISTS':
      return 'oauth.errorEmailExists';
    case 'OAUTH_ALREADY_LINKED':
      return 'oauth.errorAlreadyLinked';
    case 'OAUTH_LAST_METHOD':
      return 'oauth.errorLastMethod';
    case 'OAUTH_STATE_INVALID':
      return 'oauth.errorState';
    default:
      return 'oauth.errorGeneric';
  }
}

export default function OAuthCallbackPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [params] = useSearchParams();
  const [exchange] = useExchangeOAuthMutation();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  const code = params.get('code');
  const error = params.get('error');
  const status = params.get('status');
  const next = params.get('next') || '/dashboard';

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (status === 'linked') {
      dispatch(pushEvent({ text: t('oauth.linkSuccess'), kind: 'success' }));
      navigate('/profile', { replace: true });
      return;
    }
    if (error || !code) return;

    void exchange({ code })
      .unwrap()
      .then(async (result) => {
        tokenStorage.set(result.token);
        dispatch(baseApi.util.invalidateTags(['Me']));
        await mergeGuestWishlist(dispatch);
        navigate(next, { replace: true });
      })
      .catch(() => setFailed(true));
  }, [code, dispatch, error, exchange, navigate, next, status, t]);

  const problem = error ? errorMessageKey(error) : failed ? 'oauth.errorGeneric' : null;

  return (
    <div className="page">
      <main className="main">
        <div className="container">
          <div className="oauth-callback-card">
            {problem ? (
              <>
                <div className="oauth-callback-icon is-error">
                  <Icon name="alert" size={28} />
                </div>
                <h1>{t('oauth.callbackTitle')}</h1>
                <p className="muted">{t(problem as Parameters<typeof t>[0])}</p>
                <div className="oauth-callback-actions">
                  <Link to="/login" className="btn btn-primary">
                    {t('oauth.backToLogin')}
                  </Link>
                  <Link to="/profile" className="btn">
                    {t('oauth.goProfile')}
                  </Link>
                </div>
              </>
            ) : (
              <>
                <Spinner />
                <h1>{t('oauth.callbackTitle')}</h1>
                <p className="muted">{t('oauth.processing')}</p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
