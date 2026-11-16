import { useAppDispatch, useAppSelector } from '../app/hooks';
import { setViewMode, selectViewMode } from '../features/ui/uiSlice';
import { useT, type TranslationKey } from '../i18n';
import Icon, { type IconName } from './Icon';
import type { ViewMode } from '../types';

const MODES: ReadonlyArray<{ value: ViewMode; icon: IconName; key: TranslationKey }> = [
  { value: 'cards', icon: 'grid', key: 'view.cards' },
  { value: 'text', icon: 'list', key: 'view.list' },
];

export default function ViewToggle() {
  const dispatch = useAppDispatch();
  const viewMode = useAppSelector(selectViewMode);
  const { t } = useT();

  return (
    <div className="view-toggle" role="tablist" aria-label="View mode">
      {MODES.map((mode) => (
        <button
          key={mode.value}
          className={viewMode === mode.value ? 'active' : ''}
          onClick={() => dispatch(setViewMode(mode.value))}
          role="tab"
          aria-selected={viewMode === mode.value}
        >
          <Icon name={mode.icon} size={14} />
          <span className="view-toggle-label">{t(mode.key)}</span>
        </button>
      ))}
    </div>
  );
}
