import type { CSSProperties, DragEvent, MouseEvent } from 'react';
import { useGetBestPriceQuery } from '../../../api/baseApi';
import { useT } from '../../../i18n';
import { convertAmount, formatMoney, useCurrency } from '../../../utils/currency';
import type { Category, WishItem } from '../../../types';

interface WishItemRowProps {
  item: WishItem;
  category: Category | null;
  canDelete: boolean;
  dragging: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOffers: () => void;
  onContextMenu: (event: MouseEvent) => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
}


export default function WishItemRow({
  item,
  category,
  canDelete,
  dragging,
  onEdit,
  onDelete,
  onOffers,
  onContextMenu,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: WishItemRowProps) {
  const { t } = useT();
  const { base, rates } = useCurrency();

  const needMarketPrice = item.price === null;
  const { data: bestPrice } = useGetBestPriceQuery(
    { query: item.title, kind: item.kind },
    { skip: !needMarketPrice },
  );

  const style = { '--author-color': item.authorColor } as CSSProperties;


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

  return (
    <div
      className={`wish-row ${item.status === 'purchased' ? 'status-purchased' : ''} ${dragging ? 'dragging' : ''}`}
      style={style}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDragEnd}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu(event);
      }}
    >
      <span className="wish-author" title={`${t('wishlist.author')}: ${item.authorName}`}>
        <span className="dot" />
      </span>
      <div className="wish-row-title">
        {item.title}
        {item.status === 'reserved' && (
          <span className="badge" style={{ marginLeft: 6 }}>
            🔒 {t('wishlist.reserved')}:{' '}
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
        <button className="btn btn-sm btn-accent" onClick={onOffers} title={t('wishlist.offersBtn')}>
          🛒
        </button>
        <button className="btn btn-sm btn-ghost" onClick={onEdit} title={t('common.edit')}>
          ✏️
        </button>
        {canDelete && (
          <button className="btn btn-sm btn-danger" onClick={onDelete} title={t('common.delete')}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
