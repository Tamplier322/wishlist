import { useEffect, useRef, useState } from 'react';
import { pushEvent } from '../features/notifications/notificationsSlice';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { clearHistory, markAllRead, selectUnreadCount } from '../features/notifications/notificationsSlice';
import { enablePush } from '../api/push-client';
import { useT } from '../i18n';


export default function NotificationsBell() {
  const dispatch = useAppDispatch();
  const { t } = useT();
  const history = useAppSelector((state) => state.notifications.history);
  const unread = useAppSelector(selectUnreadCount);

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent): void {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function formatTime(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleString(undefined, {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="bell-wrap" ref={panelRef}>
      <button
        className="bell"
        aria-label={t('notificationsPanel.title')}
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open && unread > 0) dispatch(markAllRead());
        }}
      >
        🔔
        {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="bell-panel">
          <div className="bell-panel-header">
            <span>{t('notificationsPanel.title')}</span>
            {history.length > 0 && (
              <button className="btn-ghost btn-sm link" onClick={() => dispatch(clearHistory())}>
                {t('notificationsPanel.clear')}
              </button>
            )}
          </div>

          {typeof Notification !== 'undefined' && Notification.permission !== 'granted' && (
            <button
              className="btn btn-sm"
              style={{ width: '100%', marginBottom: 8 }}
              onClick={() => {
                void enablePush().then(() => dispatch(pushEvent({ text: t('notifications.pushEnabled'), kind: 'success' })));
              }}
            >
              🔔 {t('notifications.enablePush')}
            </button>
          )}

          {history.length === 0 && <div className="bell-empty">{t('notificationsPanel.empty')}</div>}

          <div className="bell-list">
            {history.map((entry) => (
              <div key={entry.id} className={`bell-item ${entry.read ? '' : 'unread'}`}>
                <span className={`bell-kind kind-${entry.kind}`} />
                <span className="bell-text">{entry.text}</span>
                <span className="faint">{formatTime(entry.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
