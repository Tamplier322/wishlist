import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type TouchEvent,
} from 'react';
import { buildResponsiveImage } from '../../../utils/responsive-image';
import { useGetBestImageQuery, useGetBestPriceQuery } from '../../../api/baseApi';
import { useAppDispatch } from '../../../app/hooks';
import { pushEvent } from '../../notifications/notificationsSlice';
import Icon from '../../../components/Icon';
import { useT } from '../../../i18n';
import { PRIORITY_KEYS } from '../../../i18n/labels';
import { convertAmount, formatMoney, useCurrency } from '../../../utils/currency';
import { KIND_ICONS, PRIORITY_ICONS } from '../../../utils/item-icons';
import type { Category, WishItem } from '../../../types';


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
  selectionMode?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  item: WishItem;
  category: Category | null;
  canDelete: boolean;
  canToggleStatus?: boolean;
  dragging: boolean;
  draggable?: boolean;
  onOpen?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOffers: () => void;
  onComments?: () => void;
  onToggleStatus?: () => void;
  onContextMenu: (event: MouseEvent) => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
  onKeyboardMove?: (direction: -1 | 1) => void;
}

export default function WishItemCard({
  item,
  category,
  canDelete,
  canToggleStatus = false,
  dragging,
  draggable = true,
  onOpen,
  onEdit,
  onDelete,
  onOffers,
  selectionMode = false,
  selected = false,
  onSelect,
  onComments,
  onToggleStatus,
  onContextMenu,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onKeyboardMove,
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
  const imageProps = buildResponsiveImage(resolvedImage, [320, 640, 960], 640);


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
          text: t('priceHistory.priceDrop', {
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

  const dragEndedAtRef = useRef(0);
  const [swipeX, setSwipeX] = useState(0);
  const swipeXRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipingRef = useRef(false);

  const style = {
    '--author-color': item.authorColor,
    transform: swipeX !== 0 ? `translateX(${swipeX}px)` : undefined,
  } as CSSProperties;

  function handleDragStart(event: DragEvent): void {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.id);
    onDragStart();
  }

  function handleCardClick(event: MouseEvent<HTMLElement>): void {
    if (selectionMode) {
      onSelect?.();
      return;
    }
    if (!onOpen) return;
    if (Date.now() - dragEndedAtRef.current < 250) return;
    if ((event.target as HTMLElement).closest('button, a, input, textarea, select, label')) return;
    onOpen();
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

  function handleTouchStart(event: TouchEvent<HTMLElement>): void {
    if (selectionMode || event.touches.length !== 1) return;
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    swipingRef.current = false;
  }

  function handleTouchMove(event: TouchEvent<HTMLElement>): void {
    const start = touchStartRef.current;
    if (!start) return;
    const touch = event.touches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (!swipingRef.current) {
      if (Math.abs(dx) < 16) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.4) {
        touchStartRef.current = null;
        return;
      }
      swipingRef.current = true;
    }
    const limit = canDelete ? 110 : 90;
    const next = Math.max(-limit, Math.min(limit, dx));
    swipeXRef.current = next;
    setSwipeX(next);
  }

  function handleTouchEnd(): void {
    const offset = swipeXRef.current;
    touchStartRef.current = null;
    swipeXRef.current = 0;
    setSwipeX(0);
    swipingRef.current = false;
    if (Math.abs(offset) < 12) return;
    dragEndedAtRef.current = Date.now();
    if (offset <= -72 && canDelete) {
      onDelete();
    } else if (offset >= 72 && canToggleStatus) {
      onToggleStatus?.();
    }
  }

  return (
    <article
      className={`wish-card ${item.status === 'purchased' ? 'status-purchased' : ''} ${dragging ? 'dragging' : ''} ${onOpen ? 'wish-card-clickable' : ''} ${selected ? 'is-selected' : ''} ${swipeX < -8 ? 'swipe-left' : swipeX > 8 ? 'swipe-right' : ''}`}
      style={style}
      draggable={draggable}
      tabIndex={onKeyboardMove ? 0 : undefined}
      aria-keyshortcuts={onKeyboardMove ? 'Alt+ArrowUp Alt+ArrowDown' : undefined}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
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
      {selectionMode && (
        <span className={`wish-select ${selected ? 'on' : ''}`} aria-hidden>
          {selected && <Icon name="check" size={12} />}
        </span>
      )}
      <div className="wish-card-img">
        {resolvedImage ? (
          <img
            src={imageProps.src}
            srcSet={imageProps.srcSet}
            sizes="(max-width: 700px) 90vw, 320px"
            alt={item.title}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="wish-kind-icon" aria-hidden>
            <Icon name={KIND_ICONS[item.kind]} size={38} />
          </span>
        )}
        {item.priority === 'high' && (
          <span className="wish-ribbon">
            <Icon name="flame" size={12} />
            {t('wishlist.priorityHigh')}
          </span>
        )}
        {item.status === 'purchased' && (
          <span className="wish-status-overlay" aria-hidden>
            <Icon name="check-circle" size={30} />
          </span>
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
          <span className="badge priority-badge" data-priority={item.priority}>
            <Icon name={PRIORITY_ICONS[item.priority]} size={12} />
            {t(PRIORITY_KEYS[item.priority])}
          </span>
          {item.status !== 'wanted' && (
            <span className="badge">
              {item.status === 'purchased' ? (
                <>
                  <Icon name="check-circle" size={12} />
                  {t('wishlist.purchased')}
                </>
              ) : (
                <>
                  <Icon name="lock" size={12} />
                  {t('wishlist.reserved')}:{' '}
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
                {t('wishlist.linkToProduct')}
                <Icon name="external" size={11} />
              </a>
            </>
          )}
        </div>
      </div>

      <div className="wish-card-actions">
        <button className="btn btn-sm btn-accent" onClick={onOffers}>
          <Icon name="cart" size={14} />
          {t('wishlist.offersBtn')}
        </button>
        {onComments && (
          <button
            className="btn btn-sm"
            onClick={onComments}
            title={t('comments.title')}
            aria-label={t('comments.title')}
          >
            <Icon name="chat" size={14} />
          </button>
        )}
        {canToggleStatus && onToggleStatus && item.status !== 'purchased' && (
          <button className="btn btn-sm" onClick={onToggleStatus}>
            <Icon name={item.status === 'wanted' ? 'lock' : 'unlock'} size={13} />
            {item.status === 'wanted' ? t('wishlist.reserve') : t('wishlist.unreserve')}
          </button>
        )}
        <button className="btn btn-sm btn-ghost" onClick={onEdit}>
          <Icon name="edit" size={13} />
          {t('common.edit')}
        </button>
        {canDelete && (
          <button className="btn btn-sm btn-danger" onClick={onDelete}>
            <Icon name="trash" size={13} />
            {t('common.delete')}
          </button>
        )}
      </div>
    </article>
  );
}
