import { useEffect, type CSSProperties, type DragEvent, type MouseEvent } from 'react';
import { useGetBestImageQuery, useGetBestPriceQuery } from '../../../api/baseApi';
import { useAppDispatch } from '../../../app/hooks';
import { pushEvent } from '../../notifications/notificationsSlice';
import { useT } from '../../../i18n';
import { convertAmount, formatMoney, useCurrency } from '../../../utils/currency';
import type { Category, WishItem } from '../../../types';

const KIND_ICONS: Record<WishItem['kind'], string> = {
  game: '🎮',
  skin: '🔫',
  book: '📚',
  app: '📱',
  tech: '💻',
  other: '🎁',
};

const PRIORITY_COLORS: Record<WishItem['priority'], string> = {
  low: 'var(--faint)',
  medium: 'var(--peach-deep)',
  high: 'var(--danger)',
};


function readPriceHistory(itemId: string): Array<{ t: number; p: number }> {
  try {
    const raw = localStorage.getItem(`wl_price_hist:${itemId}`);
    const parsed = raw ? (JSON.parse(raw) as Array<{ t: number; p: number }>) : [];
    return Array.isArray(parsed) ? parsed.slice(-20) : [];
  } catch {
    return [];
  }
}

function savePricePoint(itemId: string, price: number): Array<{ t: number; p: number }> {
  const history = [...readPriceHistory(itemId), { t: Date.now(), p: price }].slice(-20);
  localStorage.setItem(`wl_price_hist:${itemId}`, JSON.stringify(history));
  return history;
}

interface WishItemCardProps {
  item: WishItem;
  category: Category | null;
  canDelete: boolean;
  canToggleStatus?: boolean;
  dragging: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOffers: () => void;
  onComments?: () => void;
  onToggleStatus?: () => void;
  onContextMenu: (event: MouseEvent) => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
}

export default function WishItemCard({
  item,
  category,
  canDelete,
  canToggleStatus = false,
  dragging,
  onEdit,
  onDelete,
  onOffers,
  onComments,
  onToggleStatus,
  onContextMenu,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: WishItemCardProps) {
  const { t } = useT();
  const { base, rates } = useCurrency();

  const needMarketPrice = item.price === null;
  const { data: bestPrice } = useGetBestPriceQuery(
    { query: item.title, kind: item.kind },
    { skip: !needMarketPrice },
  );

  const needImage = item.imageUrl === '';
  const { data: bestImage } = useGetBestImageQuery(
    { query: item.title, kind: item.kind },
    { skip: !needImage },
  );
  const resolvedImage = item.imageUrl || bestImage?.url || null;


  const shownPrice = item.price !== null ? convertAmount(item.price, item.currency, base, rates) : null;
  const shownMarket =
    bestPrice !== null && bestPrice !== undefined
      ? convertAmount(bestPrice.price, bestPrice.currency, base, rates)
      : null;

  const dispatch = useAppDispatch();


  useEffect(() => {
    if (!bestPrice) return;
    const previous = readPriceHistory(item.id);
    const min = previous.length > 0 ? Math.min(...previous.map((point) => point.p)) : Infinity;
    if (previous.length > 0 && bestPrice.price < min) {
      dispatch(
        pushEvent({
          text: t('notifications.priceDrop', {
            title: item.title,
            price: bestPrice.price,
            currency: bestPrice.currency,
          }),
          kind: 'success',
        }),
      );
    }
    if (previous.length === 0 || bestPrice.price !== previous[previous.length - 1]?.p) {
      savePricePoint(item.id, bestPrice.price);
    }
  }, [dispatch, bestPrice, item.id, item.title, t]);

  const style = { '--author-color': item.authorColor } as CSSProperties;

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
    <article
      className={`wish-card ${item.status === 'purchased' ? 'status-purchased' : ''} ${dragging ? 'dragging' : ''}`}
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
      <div className="wish-card-img">
        {resolvedImage ? (
          <img src={resolvedImage} alt={item.title} loading="lazy" />
        ) : (
          <span aria-hidden>{KIND_ICONS[item.kind]}</span>
        )}
      </div>

      <div className="wish-card-body">
        <div className="wish-card-title-row">
          <h4 className="wish-card-title">{item.title}</h4>
          {item.price !== null ? (
            <span
              className="wish-price"
              title={
                shownPrice !== null ? `${item.price} ${item.currency}` : undefined
              }
            >
              {shownPrice !== null ? formatMoney(shownPrice, base) : `${item.price} ${item.currency}`}
            </span>
          ) : bestPrice ? (
            <span
              className="wish-price market"
              title={`${t('wishlist.marketPrice')} · ${bestPrice.provider}`}
            >
              ≈{' '}
              {shownMarket !== null
                ? formatMoney(shownMarket, base)
                : `${bestPrice.price} ${bestPrice.currency}`}
            </span>
          ) : null}
        </div>

        <p className="wish-card-desc">{item.description}</p>

        <div className="wish-card-meta">
          {category && (
            <span className="badge">
              <span className="badge-dot" style={{ background: category.color }} />
              {category.name}
            </span>
          )}
          <span className="badge" style={{ color: PRIORITY_COLORS[item.priority] }}>
            {t('wishlist.priorityLabel')}:{' '}
            {t(`wishlist.priority${item.priority.charAt(0).toUpperCase()}${item.priority.slice(1)}`)}
          </span>
          {item.status !== 'wanted' && (
            <span className="badge">
              {item.status === 'purchased' ? (
                `✓ ${t('wishlist.purchased')}`
              ) : (
                <>
                  🔒 {t('wishlist.reserved')}:{' '}
                  <span style={{ color: item.reservedByColor ?? 'inherit', fontWeight: 700 }}>
                    {item.reservedByName ?? ''}
                  </span>
                </>
              )}
            </span>
          )}
        </div>

        <div className="wish-author">
          <span className="dot" />
          {t('wishlist.author')}: {item.authorName}
          {item.link && (
            <>
              {' · '}
              <a href={item.link} target="_blank" rel="noreferrer" style={{ color: 'var(--peach-deep)' }}>
                {t('wishlist.linkToProduct')} ↗
              </a>
            </>
          )}
        </div>
      </div>

      <div className="wish-card-actions">
        <button className="btn btn-sm btn-accent" onClick={onOffers}>
          🛒 {t('wishlist.offersBtn')}
        </button>
        {onComments && (
          <button className="btn btn-sm" onClick={onComments} title={t('comments.title')}>
            💬
          </button>
        )}
        {canToggleStatus && onToggleStatus && item.status !== 'purchased' && (
          <button className="btn btn-sm" onClick={onToggleStatus}>
            {item.status === 'wanted' ? `🔒 ${t('wishlist.reserve')}` : `🔓 ${t('wishlist.unreserve')}`}
          </button>
        )}
        <button className="btn btn-sm btn-ghost" onClick={onEdit}>
          {t('common.edit')}
        </button>
        {canDelete && (
          <button className="btn btn-sm btn-danger" onClick={onDelete}>
            {t('common.delete')}
          </button>
        )}
      </div>
    </article>
  );
}
