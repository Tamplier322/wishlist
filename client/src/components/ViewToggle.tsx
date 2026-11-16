import { useAppDispatch, useAppSelector } from '../app/hooks';
import { setViewMode, selectViewMode } from '../features/ui/uiSlice';
import { useT } from '../i18n';
import type { ViewMode } from '../types';

const MODES: ReadonlyArray<{ value: ViewMode; icon: string; key: string }> = [
  { value: 'cards', icon: '▦', key: 'view.cards' },
  { value: 'text', icon: '☰', key: 'view.list' },
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
          <span aria-hidden>{mode.icon}</span>
          {t(mode.key)}
        </button>
      ))}
    </div>
  );
}
