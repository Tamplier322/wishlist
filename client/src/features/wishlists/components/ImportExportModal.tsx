import { useState } from 'react';
import Modal from '../../../components/Modal';
import { useT } from '../../../i18n';

interface ImportExportModalProps {
  wishlistName: string;
  onImport: (lines: string[]) => void;
  onExportText: () => void;
  onExportPng: () => void;
  onClose: () => void;
}


export default function ImportExportModal({
  wishlistName,
  onImport,
  onExportText,
  onExportPng,
  onClose,
}: ImportExportModalProps) {
  const { t } = useT();
  const [text, setText] = useState('');

  function handleImport(): void {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length === 0) return;
    onImport(lines);
    onClose();
  }

  return (
    <Modal title={`${t('importExport.modalTitle')}: ${wishlistName}`} onClose={onClose}>
      <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
        {t('importExport.hint')}
      </p>
      <textarea
        className="textarea"
        rows={7}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={'Наушники беспроводные | 150 USD\nКнига «Дюна»\nПодарочный сертификат'}
      />
      <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
        <button className="btn btn-primary" onClick={handleImport} disabled={!text.trim()}>
          {t('importExport.importAction')}
        </button>
      </div>

      <div className="auth-divider">{t('common.or')}</div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn" onClick={onExportText}>
          📋 {t('wishlist.copyLink')} ({t('common.edit').toLowerCase()})
        </button>
        <button className="btn" onClick={onExportPng}>
          🖼 {t('importExport.exportPng')}
        </button>
      </div>
    </Modal>
  );
}
