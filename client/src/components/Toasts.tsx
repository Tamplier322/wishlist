import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { dismissToast } from '../features/notifications/notificationsSlice';
import Icon, { type IconName } from './Icon';

const AUTO_DISMISS_MS = 5000;

const TOAST_ICONS: Record<string, IconName> = {
  success: 'check-circle',
  error: 'alert',
  info: 'info',
};

function Toast({ id, text, kind }: { id: number; text: string; kind: string }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismissToast(id)), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [dispatch, id]);

  return (
    <button className={`toast toast-${kind}`} onClick={() => dispatch(dismissToast(id))}>
      <span className="toast-icon" aria-hidden>
        <Icon name={TOAST_ICONS[kind] ?? 'info'} size={17} />
      </span>
      <span className="toast-text">{text}</span>
      <span className="toast-progress" aria-hidden />
    </button>
  );
}

export default function Toasts() {
  const toasts = useAppSelector((state) => state.notifications.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <Toast key={toast.id} id={toast.id} text={toast.text} kind={toast.kind} />
      ))}
    </div>
  );
}
