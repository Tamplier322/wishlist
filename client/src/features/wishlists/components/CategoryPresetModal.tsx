import { useMemo, useState } from 'react';
import Modal from '../../../components/Modal';
import { PRESET_CATEGORIES } from '../../../utils/presets';
import { useT } from '../../../i18n';

const CUSTOM_COLORS = ['#dd7a3d', '#7c8b6f', '#cbb695', '#5b7185', '#a4563f', '#8f6b8a'];

interface CategoryPresetModalProps {
  onAdd: (name: string, color: string) => void;
  onClose: () => void;
}


export default function CategoryPresetModal({ onAdd, onClose }: CategoryPresetModalProps) {
  const { t } = useT();
  const [search, setSearch] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customColor, setCustomColor] = useState(CUSTOM_COLORS[0]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return PRESET_CATEGORIES;
    return PRESET_CATEGORIES.filter((preset) => preset.name.toLowerCase().includes(query));
  }, [search]);

  function add(name: string, color: string): void {
    onAdd(name, color);
    onClose();
  }

  return (
    <Modal title={t('wishlist.addCategory')} onClose={onClose}>
      <input
        className="input"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t('wishlist.presetSearch')}
        autoFocus
      />

      {!customMode && (
        <>
          <div className="preset-grid">
            {filtered.map((preset) => (
              <button
                key={preset.name}
                className="preset-item"
                onClick={() => add(preset.name, preset.color)}
              >
                <span className="badge-dot" style={{ background: preset.color }} />
                {preset.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="faint" style={{ padding: '10px 0' }}>
                {t('wishlist.presetNotFound')}
              </div>
            )}
          </div>

          <button className="btn btn-sm btn-ghost" style={{ marginTop: 12 }} onClick={() => setCustomMode(true)}>
            {t('wishlist.customCategory')}
          </button>
        </>
      )}

      {customMode && (
        <div style={{ marginTop: 12 }}>
          <div className="field">
            <label htmlFor="custom-cat">{t('wishlist.categoryName')}</label>
            <input
              id="custom-cat"
              className="input"
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              placeholder={t('wishlist.categoryName')}
            />
          </div>
          <div className="field">
            <label>{t('form.priority') && 'Цвет'}</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CUSTOM_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setCustomColor(color)}
                  aria-label={color}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: color,
                    border: customColor === color ? '3px solid var(--ink)' : '1px solid var(--line-strong)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>
          <div className="modal-actions" style={{ marginTop: 8 }}>
            <button className="btn btn-ghost" onClick={() => setCustomMode(false)}>
              {t('common.cancel')}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => customName.trim() && add(customName.trim(), customColor)}
              disabled={!customName.trim()}
            >
              {t('common.create')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
