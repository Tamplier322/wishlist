import { useEffect, useRef } from 'react';
import { useT } from '../i18n';

export interface ContextMenuItem {
  label: string;
  icon: string;
  danger?: boolean;
  onSelect: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const { t } = useT();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointer(event: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose();
    }
    function handleKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('contextmenu', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('contextmenu', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const left = Math.min(x, window.innerWidth - 190);
  const top = Math.min(y, window.innerHeight - 40 - items.length * 40);

  return (
    <div ref={menuRef} className="context-menu" style={{ left, top }} role="menu">
      {items.map((item) => (
        <button
          key={item.label}
          className={`context-menu-item ${item.danger ? 'danger' : ''}`}
          role="menuitem"
          onClick={() => {
            item.onSelect();
            onClose();
          }}
        >
          <span aria-hidden>{item.icon}</span>
          {item.label}
        </button>
      ))}
      <span className="faint context-menu-hint">{t('wishlist.contextHint')}</span>
    </div>
  );
}
