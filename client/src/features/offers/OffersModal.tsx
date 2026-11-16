import Modal from '../../components/Modal';
import { useT } from '../../i18n';
import type { WishItem } from '../../types';
import OffersPanel from './OffersPanel';

interface OffersModalProps {
  item: WishItem;
  onClose: () => void;
}

export default function OffersModal({ item, onClose }: OffersModalProps) {
  const { t } = useT();

  return (
    <Modal title={t('offers.modalTitle', { title: item.title })} onClose={onClose} large>
      <OffersPanel query={item.title} kind={item.kind} />
    </Modal>
  );
}
