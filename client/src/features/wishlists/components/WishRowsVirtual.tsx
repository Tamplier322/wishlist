import { memo, useRef, useState } from 'react';
import type { Category, WishItem } from '../../../types';
import WishItemRow from './WishItemRow';

export interface WishRowsVirtualProps {
  rows: WishItem[];
  categories: Category[];
  canDelete: (item: WishItem) => boolean;
  draggingId: string | null;
  draggable?: boolean;
  onOpen?: (item: WishItem) => void;
  onEdit: (item: WishItem) => void;
  onDelete: (item: WishItem) => void;
  onOffers: (item: WishItem) => void;
  onContextMenu: (event: React.MouseEvent, item: WishItem) => void;
  onDragStart: (itemId: string) => void;
  onDragEnter: (targetId: string) => void;
  onDragEnd: () => void;
  onKeyboardMove?: (itemId: string, direction: -1 | 1) => void;
}

const ROW_HEIGHT = 64;
const VIEWPORT_HEIGHT = 640;
const OVERSCAN = 6;


export const WishRowsVirtual = memo(function WishRowsVirtual(props: WishRowsVirtualProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const total = props.rows.length;
  const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + OVERSCAN * 2;
  const last = Math.min(total, first + visibleCount);

  const visible = props.rows.slice(first, last);

  function handleScroll(event: React.UIEvent<HTMLDivElement>): void {
    setScrollTop(event.currentTarget.scrollTop);
  }

  return (
    <div
      ref={containerRef}
      className="wish-rows-virtual"
      style={{ height: VIEWPORT_HEIGHT, overflowY: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: total * ROW_HEIGHT, position: 'relative' }}>
        {visible.map((item, offset) => {
          const category =
            item.categoryId
              ? (props.categories.find((entry) => entry.id === item.categoryId) ?? null)
              : null;
          return (
            <div
              key={item.id}
              style={{
                position: 'absolute',
                top: (first + offset) * ROW_HEIGHT,
                left: 0,
                right: 0,
                height: ROW_HEIGHT,
              }}
            >
              <WishItemRow
                item={item}
                category={category}
                canDelete={props.canDelete(item)}
                dragging={props.draggingId === item.id}
                draggable={props.draggable ?? true}
                onOpen={props.onOpen ? () => props.onOpen?.(item) : undefined}
                onEdit={() => props.onEdit(item)}
                onDelete={() => props.onDelete(item)}
                onOffers={() => props.onOffers(item)}
                onContextMenu={(event) => props.onContextMenu(event, item)}
                onDragStart={() => props.onDragStart(item.id)}
                onDragEnter={() => props.onDragEnter(item.id)}
                onDragEnd={() => props.onDragEnd()}
                onKeyboardMove={
                  props.onKeyboardMove
                    ? (direction) => props.onKeyboardMove?.(item.id, direction)
                    : undefined
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});
