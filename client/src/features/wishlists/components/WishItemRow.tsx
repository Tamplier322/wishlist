import {
  useRef,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { useGetBestPriceQuery } from '../../../api/baseApi';
import Icon from '../../../components/Icon';
import { useT } from '../../../i18n';
import { convertAmount, formatMoney, useCurrency } from '../../../utils/currency';
import { PRIORITY_ICONS } from '../../../utils/item-icons';
import type { Category, WishItem } from '../../../types';

interface WishItemRowProps {
  item: WishItem;
  category: Category | null;
  canDelete: boolean;
  dragging: boolean;
  draggable?: boolean;
  onOpen?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOffers: () => void;
  onContextMenu: (event: MouseEvent) => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
  onKeyboardMove?: (direction: -1 | 1) => void;
}


export default function WishItemRow({
  item,
  category,
  canDelete,
  dragging,
  draggable = true,
  onOpen,
  onEdit,
  onDelete,
  onOffers,
  onContextMenu,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onKeyboardMove,
}: WishItemRowProps) {
  const { t } = useT();
  const { base, rates } = useCurrency();

  const needMarketPrice = item.price === null;
  const { data: bestPrice } = useGetBestPriceQuery(
    { query: item.title, kind: item.kind },
    { skip: !needMarketPrice },
  );

  const style = { '--author-color': item.authorColor } as CSSProperties;
  const dragEndedAtRef = useRef(0);

  const shownPrice = item.price !== null ? convertAmount(item.price, item.currency, base, rates) : null;
  const shownMarket =
    bestPrice ? convertAmount(bestPrice.price, bestPrice.currency, base, rates) : null;

  function handleDragStart(event: DragEvent): void {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.id);
    onDragStart();
  }

  function handleDragOver(event: DragEvent): void {
    event.preventDefault();
    onDragEnter();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>): void {
    if (!event.altKey || !onKeyboardMove) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onKeyboardMove(-1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      onKeyboardMove(1);
    }
  }

  function handleRowClick(event: MouseEvent<HTMLElement>): void {
    if (!onOpen) return;
    if (Date.now() - dragEndedAtRef.current < 250) return;
    if ((event.target as HTMLElement).closest('button, a, input, textarea, select, label')) return;
    onOpen();
  }

  return (
    <div
      className={`wish-row ${item.status === 'purchased' ? 'status-purchased' : ''} ${dragging ? 'dragging' : ''} ${onOpen ? 'wish-row-clickable' : ''}`}
      style={style}
      draggable={draggable}
      tabIndex={onKeyboardMove ? 0 : undefined}
      aria-keyshortcuts={onKeyboardMove ? 'Alt+ArrowUp Alt+ArrowDown' : undefined}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={() => {
        dragEndedAtRef.current = Date.now();
        onDragEnd();
      }}
      onDrop={() => {
        dragEndedAtRef.current = Date.now();
        onDragEnd();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu(event);
      }}
    >
      <span className="wish-author" title={`${t('wishlist.author')}: ${item.authorName}`}>
        <span className="dot" />
      </span>
      <div className="wish-row-title">
        <span className="priority-pip" data-priority={item.priority} title={t('wishlist.priorityLabel')}>
          <Icon name={PRIORITY_ICONS[item.priority]} size={11} />
        </span>
        {item.title}
        {item.status === 'reserved' && (
          <span className="badge" style={{ marginLeft: 6 }}>
            <Icon name="lock" size={11} />
            {t('wishlist.reserved')}:{' '}
            <span style={{ color: item.reservedByColor ?? 'inherit', fontWeight: 700 }}>
              {item.reservedByName ?? ''}
            </span>
          </span>
        )}
        {item.description && <span className="desc">{item.description}</span>}
      </div>
      {category ? (
        <span className="badge">
          <span className="badge-dot" style={{ background: category.color }} />
          {category.name}
        </span>
      ) : (
        <span className="badge">—</span>
      )}
      <span
        className={`wish-price ${item.price === null && bestPrice ? 'market' : ''}`}
        title={shownPrice !== null ? `${item.price} ${item.currency}` : undefined}
      >
        {item.price !== null
          ? shownPrice !== null
            ? formatMoney(shownPrice, base)
            : `${item.price} ${item.currency}`
          : bestPrice
            ? shownMarket !== null
              ? `≈ ${formatMoney(shownMarket, base)}`
              : `≈ ${bestPrice.price} ${bestPrice.currency}`
            : ''}
      </span>
      <div className="wish-row-actions">
        <button
          className="btn btn-sm btn-accent"
          onClick={onOffers}
          title={t('wishlist.offersBtn')}
          aria-label={t('wishlist.offersBtn')}
        >
          <Icon name="cart" size={14} />
        </button>
        <button
          className="btn btn-sm btn-ghost"
          onClick={onEdit}
          title={t('common.edit')}
          aria-label={t('common.edit')}
        >
          <Icon name="edit" size={14} />
        </button>
        {canDelete && (
          <button
            className="btn btn-sm btn-danger"
            onClick={onDelete}
            title={t('common.delete')}
            aria-label={t('common.delete')}
          >
            <Icon name="trash" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
