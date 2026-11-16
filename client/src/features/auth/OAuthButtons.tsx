import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  baseApi,
  useGetOAuthProvidersQuery,
  useLinkOAuthStartMutation,
  useTelegramLinkMutation,
  useTelegramLoginMutation,
} from '../../api/baseApi';
import { tokenStorage } from '../../api/client';
import { useAppDispatch } from '../../app/hooks';
import { pushEvent } from '../notifications/notificationsSlice';
import { useT } from '../../i18n';
import { getApiErrorMessage } from '../../utils/api-error';
import type { OAuthProvider } from '../../types';

const TELEGRAM_ORIGIN = 'https://oauth.telegram.org';

const TELEGRAM_FIELDS = [
  'id',
  'first_name',
  'last_name',
  'username',
  'photo_url',
  'auth_date',
  'hash',
] as const;

function toTelegramPayload(user: Record<string, unknown>): Record<string, string> {
  const payload: Record<string, string> = {};
  for (const field of TELEGRAM_FIELDS) {
    const value = user[field];
    if (value !== undefined && value !== null && value !== '') payload[field] = String(value);
  }
  return payload;
}

interface OAuthButtonsProps {
  mode?: 'login' | 'link';
  next?: string;
  connected?: OAuthProvider[];
  onLinked?: () => void;
}

export default function OAuthButtons({
  mode = 'login',
  next = '/dashboard',
  connected = [],
  onLinked,
}: OAuthButtonsProps) {
  const { t } = useT();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { data: availability } = useGetOAuthProvidersQuery();
  const [linkStart] = useLinkOAuthStartMutation();
  const [telegramLogin] = useTelegramLoginMutation();
  const [telegramLink] = useTelegramLinkMutation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw: Record<string, string> = {};
    const hashParam = window.location.hash.replace(/^#/, '');
    if (hashParam.startsWith('tgAuthResult=')) {
      try {
        const base64 = hashParam.slice('tgAuthResult='.length).replace(/-/g, '+').replace(/_/g, '/');
        const binary = window.atob(base64);
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
        Object.assign(raw, toTelegramPayload(parsed));
      } catch {
        return;
      }
    } else {
      for (const field of TELEGRAM_FIELDS) {
        const value = params.get(field);
        if (value) raw[field] = value;
      }
    }
    if (!raw.hash || !raw.id) return;
    if (window.opener && window.opener !== window) {
      window.opener.postMessage(
        { type: 'telegram-auth-result', payload: raw },
        window.location.origin,
      );
      window.close();
      return;
    }
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  function redirectToProvider(provider: 'google'): void {
    if (mode === 'link') {
      void linkStart(provider)
        .unwrap()
        .then(({ url }) => {
          window.location.href = url;
        })
        .catch((error) => {
          dispatch(
            pushEvent({ text: getApiErrorMessage(error, t('oauth.error')), kind: 'error' }),
          );
        });
      return;
    }
    const query = next && next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : '';
    window.location.href = `/api/auth/oauth/${provider}/start${query}`;
  }

  function handleTelegramAuth(raw: Record<string, unknown>): void {
    const payload = toTelegramPayload(raw);
    if (mode === 'link') {
      void telegramLink(payload)
        .unwrap()
        .then(() => {
          dispatch(pushEvent({ text: t('oauth.linkSuccess'), kind: 'success' }));
          onLinked?.();
        })
        .catch((error) => {
          dispatch(
            pushEvent({ text: getApiErrorMessage(error, t('oauth.error')), kind: 'error' }),
          );
        });
      return;
    }
    void telegramLogin(payload)
      .unwrap()
      .then((result) => {
        tokenStorage.set(result.token);
        dispatch(baseApi.util.invalidateTags(['Me']));
        navigate(next || '/dashboard');
      })
      .catch((error) => {
        dispatch(
          pushEvent({ text: getApiErrorMessage(error, t('oauth.error')), kind: 'error' }),
        );
      });
  }

  function openTelegramAuth(): void {
    const botId = availability?.telegram.botId;
    if (!botId) return;

    const width = 550;
    const height = 470;
    const left = Math.max(0, (window.screen.width - width) / 2);
    const top = Math.max(0, (window.screen.height - height) / 2);
    const returnTo = `${window.location.origin}/login?tg=1`;
    const url =
      `${TELEGRAM_ORIGIN}/auth?bot_id=${encodeURIComponent(botId)}` +
      `&origin=${encodeURIComponent(window.location.origin)}` +
      `&request_access=write` +
      `&return_to=${encodeURIComponent(returnTo)}`;

    const popup = window.open(
      url,
      `telegram_oauth_bot${botId}`,
      `width=${width},height=${height},left=${left},top=${top},status=0,location=0,menubar=0,toolbar=0`,
    );
    if (!popup) {
      dispatch(pushEvent({ text: t('oauth.popupBlocked'), kind: 'error' }));
      return;
    }
    const popupWindow = popup;
    let settled = false;

    let timer = 0;
    function cleanup(): void {
      window.removeEventListener('message', onMessage);
      if (timer) window.clearInterval(timer);
    }
    function onMessage(event: MessageEvent): void {
      let data: { event?: string; type?: string; result?: unknown; payload?: unknown };
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (event.origin === window.location.origin) {
        if (data?.type !== 'telegram-auth-result' || !data.payload) return;
        const own = data.payload as Record<string, unknown>;
        if (!own.hash || !own.id) return;
        settled = true;
        cleanup();
        popupWindow.close();
        handleTelegramAuth(own);
        return;
      }
      if (event.origin !== TELEGRAM_ORIGIN) return;
      if (!data || data.event !== 'auth_result' || !data.result) return;
      let result = data.result;
      if (typeof result === 'string') {
        try {
          result = JSON.parse(result);
        } catch {
          return;
        }
      }
      if (!result || typeof result !== 'object') return;
      settled = true;
      cleanup();
      popupWindow.close();
      handleTelegramAuth(result as Record<string, unknown>);
    }

    window.addEventListener('message', onMessage);
    timer = window.setInterval(() => {
      if (!popupWindow.closed) return;
      cleanup();
      if (!settled) {
        dispatch(pushEvent({ text: t('oauth.telegramNoResponse'), kind: 'error' }));
      }
    }, 500);
  }

  const telegramEnabled = Boolean(
    availability?.telegram.enabled && availability.telegram.botId,
  );

  if (!availability) return null;

  const showGoogle = availability.google && !connected.includes('google');
  const showTelegram = telegramEnabled && !connected.includes('telegram');
  const anyAvailable = availability.google || telegramEnabled;

  if (!showGoogle && !showTelegram) {
    return mode === 'link' && anyAvailable ? (
      <p className="faint">{t('oauth.allConnected')}</p>
    ) : null;
  }

  return (
    <div className={`oauth-buttons ${mode === 'link' ? 'is-link' : ''}`}>
      {mode === 'login' && <div className="auth-divider">{t('oauth.or')}</div>}
      {showGoogle && (
        <button
          type="button"
          className="oauth-btn oauth-google"
          onClick={() => redirectToProvider('google')}
        >
          <svg className="oauth-google-icon" viewBox="0 0 48 48" aria-hidden focusable="false">
            <path
              fill="#FFC107"
              d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44c7.7 0 14.3-4.3 17.7-10.7 1.5-3 2.3-6.5 2.3-9.3 0-1.3-.1-2.6-.4-3.9z"
            />
          </svg>
          {mode === 'link' ? t('oauth.linkGoogle') : t('oauth.google')}
        </button>
      )}
      {showTelegram && (
        <button
          type="button"
          className="oauth-btn oauth-telegram-btn"
          onClick={openTelegramAuth}
        >
          <svg className="oauth-telegram-icon" viewBox="0 0 24 24" aria-hidden focusable="false">
            <path
              fill="#229ED9"
              d="M23.9 3.8 20.3 20.8c-.3 1.2-1 1.5-2 .9l-5.5-4-2.7 2.6c-.3.3-.6.6-1.1.6-.7 0-.6-.3-.8-.9l-1.9-6.3-5.4-1.7c-1.2-.4-1.2-1.2.3-1.8L22.4 2c1-.4 1.9.2 1.5 1.8Z"
            />
          </svg>
          {mode === 'link' ? t('oauth.linkTelegram') : t('oauth.telegram')}
        </button>
      )}
    </div>
  );
}
