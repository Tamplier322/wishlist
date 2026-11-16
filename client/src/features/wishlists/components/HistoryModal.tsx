import Modal from '../../../components/Modal';
import { useGetWishlistHistoryQuery } from '../../../api/baseApi';
import { useT, type TranslationKey } from '../../../i18n';
import type { WishlistEventAction } from '../../../types';

interface HistoryModalProps {
  wishlistId: string;
  onClose: () => void;
}

const ACTION_KEYS: Record<WishlistEventAction, TranslationKey> = {
  'item-added': 'history.actions.item-added',
  'item-updated': 'history.actions.item-updated',
  'item-removed': 'history.actions.item-removed',
  'item-restored': 'history.actions.item-restored',
  'item-purged': 'history.actions.item-purged',
  'wishlist-updated': 'history.actions.wishlist-updated',
  'member-removed': 'history.actions.member-removed',
  'category-changed': 'history.actions.category-changed',
};

export default function HistoryModal({ wishlistId, onClose }: HistoryModalProps) {
  const { t, formatDateTime } = useT();
  const { data: events = [], isLoading } = useGetWishlistHistoryQuery({ wishlistId, limit: 100 });

  return (
    <Modal title={t('history.title')} onClose={onClose} large>
      {isLoading ? (
        <p className="muted">{t('common.loading')}</p>
      ) : events.length === 0 ? (
        <p className="muted">{t('history.empty')}</p>
      ) : (
        <ol className="history-list">
          {events.map((event) => (
            <li key={event.id} className="history-row">
              <span className="history-dot" aria-hidden="true" />
              <div className="history-body">
                <p>
                  <strong>{event.actorName}</strong> {t(ACTION_KEYS[event.action])}
                  {event.title ? <> «{event.title}»</> : null}
                </p>
                <span className="muted">{formatDateTime(event.createdAt)}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}
