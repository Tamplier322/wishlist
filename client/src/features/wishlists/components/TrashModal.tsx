import Modal from '../../../components/Modal';
import Icon from '../../../components/Icon';
import {
  useGetTrashQuery,
  usePurgeItemMutation,
  useRestoreItemMutation,
} from '../../../api/baseApi';
import { useDialog } from '../../../components/DialogProvider';
import { useT } from '../../../i18n';
import { getApiErrorMessage } from '../../../utils/api-error';
import type { TrashItem } from '../../../types';

interface TrashModalProps {
  wishlistId: string;
  onClose: () => void;
}

export default function TrashModal({ wishlistId, onClose }: TrashModalProps) {
  const { t, formatDate } = useT();
  const { confirm, alert } = useDialog();
  const { data: items = [], isLoading } = useGetTrashQuery(wishlistId);
  const [restore, { isLoading: restoring }] = useRestoreItemMutation();
  const [purge, { isLoading: purging }] = usePurgeItemMutation();
  const busy = restoring || purging;

  async function handleRestore(item: TrashItem): Promise<void> {
    try {
      await restore({ wishlistId, itemId: item.id }).unwrap();
    } catch (error) {
      await alert(getApiErrorMessage(error, t('trash.restore')));
    }
  }

  async function handlePurge(item: TrashItem): Promise<void> {
    const ok = await confirm({
      title: t('trash.purgeTitle'),
      message: t('trash.purgeConfirm', { title: item.title }),
      danger: true,
    });
    if (!ok) return;
    try {
      await purge({ wishlistId, itemId: item.id }).unwrap();
    } catch (error) {
      await alert(getApiErrorMessage(error, t('trash.purge')));
    }
  }

  return (
    <Modal title={t('trash.title')} onClose={onClose} busy={busy}>
      <p className="muted" style={{ marginBottom: 14 }}>
        {t('trash.hint')}
      </p>
      {isLoading ? (
        <p className="muted">{t('common.loading')}</p>
      ) : items.length === 0 ? (
        <div className="empty-state" style={{ padding: '28px 12px' }}>
          <Icon name="trash" size={28} />
          <h3>{t('trash.empty')}</h3>
        </div>
      ) : (
        <ul className="trash-list">
          {items.map((item) => (
            <li key={item.id} className="trash-row">
              <div className="trash-info">
                <strong>{item.title}</strong>
                <span className="muted">
                  {t('trash.deletedAt', { date: formatDate(item.deletedAt) })}
                </span>
              </div>
              <div className="trash-actions">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => void handleRestore(item)}
                  disabled={busy}
                >
                  <Icon name="retry" size={13} />
                  {t('trash.restore')}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => void handlePurge(item)}
                  disabled={busy}
                >
                  <Icon name="trash" size={13} />
                  {t('trash.purge')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
