import { useGetBestImageQuery, useGetBestPriceQuery } from '../../../api/baseApi';
import Icon from '../../../components/Icon';
import Modal from '../../../components/Modal';
import { useT } from '../../../i18n';
import { KIND_KEYS, PRIORITY_KEYS, STATUS_KEYS } from '../../../i18n/labels';
import { convertAmount, formatMoney, useCurrency } from '../../../utils/currency';
import { buildResponsiveImage } from '../../../utils/responsive-image';
import { KIND_ICONS, PRIORITY_ICONS } from '../../../utils/item-icons';
import type { Category, WishItem } from '../../../types';
import OffersPanel from '../../offers/OffersPanel';
import PriceTrend from '../../offers/PriceTrend';

interface WishDetailsModalProps {
  item: WishItem;
  category: Category | null;
  canDelete?: boolean;
  canToggleStatus?: boolean;
  canEdit?: boolean;
  canComment?: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleStatus?: () => void;
  onComments?: () => void;
}

export default function WishDetailsModal({
  item,
  category,
  canDelete = false,
  canToggleStatus = false,
  canEdit = false,
  canComment = false,
  onClose,
  onEdit,
  onDelete,
  onToggleStatus,
  onComments,
}: WishDetailsModalProps) {
  const { t, formatDate } = useT();
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

  const image = item.imageUrl || bestImage?.url || null;
  const imageProps = buildResponsiveImage(image, [480, 800, 1200], 800);

  const shownPrice =
    item.price !== null ? convertAmount(item.price, item.currency, base, rates) : null;
  const shownMarket =
    bestPrice ? convertAmount(bestPrice.price, bestPrice.currency, base, rates) : null;

  const priorityLabel = t(
    PRIORITY_KEYS[item.priority],
  );
  const kindLabel = t(KIND_KEYS[item.kind]);
  const statusLabel = t(STATUS_KEYS[item.status]);

  const hasActions = canEdit || canDelete || canComment || (canToggleStatus && onToggleStatus);

  return (
    <Modal title={t('details.modalTitle')} onClose={onClose} wide>
      <div className="wish-details-grid" data-testid="wish-details">
        <div className="wish-details-media">
          <div className="wish-details-image">
            {image ? (
              <img
                src={imageProps.src}
                srcSet={imageProps.srcSet}
                sizes="(max-width: 900px) 90vw, 520px"
                alt={item.title}
                decoding="async"
              />
            ) : (
              <span className="wish-details-placeholder" aria-hidden>
                <Icon name={KIND_ICONS[item.kind]} size={72} />
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
                <Icon name="check-circle" size={40} />
              </span>
            )}
          </div>

          <div className="wish-details-badges">
            <span className="badge priority-badge" data-priority={item.priority}>
              <Icon name={PRIORITY_ICONS[item.priority]} size={12} />
              {priorityLabel}
            </span>
            <span className="badge">
              <Icon name={KIND_ICONS[item.kind]} size={12} />
              {kindLabel}
            </span>
            {category && (
              <span className="badge">
                <span className="badge-dot" style={{ background: category.color }} />
                {category.name}
              </span>
            )}
            <span className="badge" data-status={item.status}>
              {item.status === 'purchased' ? (
                <>
                  <Icon name="check-circle" size={12} />
                  {statusLabel}
                </>
              ) : item.status === 'reserved' ? (
                <>
                  <Icon name="lock" size={12} />
                  {statusLabel}
                  {item.reservedByName && (
                    <span style={{ color: item.reservedByColor ?? 'inherit', fontWeight: 700 }}>
                      {' '}
                      · {item.reservedByName}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Icon name="gift" size={12} />
                  {statusLabel}
                </>
              )}
            </span>
          </div>

          <div className="wish-details-price-block">
            {item.price !== null ? (
              <>
                <span className="faint">{t('details.price')}</span>
                <span className="wish-details-price">
                  {shownPrice !== null ? formatMoney(shownPrice, base) : `${item.price} ${item.currency}`}
                </span>
              </>
            ) : bestPrice ? (
              <>
                <span className="faint">
                  {t('details.marketPrice')} · {bestPrice.provider}
                </span>
                <span className="wish-details-price market">
                  ≈{' '}
                  {shownMarket !== null
                    ? formatMoney(shownMarket, base)
                    : `${bestPrice.price} ${bestPrice.currency}`}
                </span>
              </>
            ) : (
              <span className="faint">{t('details.noPrice')}</span>
            )}
          </div>

          <PriceTrend query={item.title} kind={item.kind} />

          {item.link && (
            <a className="btn wish-details-link" href={item.link} target="_blank" rel="noreferrer">
              <Icon name="external" size={15} />
              {t('details.openLink')}
            </a>
          )}
        </div>

        <div className="wish-details-content">
          <h2 className="wish-details-title">{item.title}</h2>

          {item.description ? (
            <p className="wish-details-description">{item.description}</p>
          ) : (
            <p className="wish-details-description faint">{t('details.noDescription')}</p>
          )}

          <dl className="wish-details-meta">
            <div>
              <dt>{t('details.category')}</dt>
              <dd>{category ? category.name : t('details.noCategory')}</dd>
            </div>
            <div>
              <dt>{t('details.priority')}</dt>
              <dd>{priorityLabel}</dd>
            </div>
            <div>
              <dt>{t('details.status')}</dt>
              <dd>
                {statusLabel}
                {item.status === 'reserved' && item.reservedByName ? ` · ${item.reservedByName}` : ''}
                {item.status === 'reserved' && item.reservedUntil
                  ? ` · ${t('wishlist.reservedUntil')} ${formatDate(item.reservedUntil)}`
                  : ''}
              </dd>
            </div>
            <div>
              <dt>{t('details.author')}</dt>
              <dd style={{ color: item.authorColor }}>{item.authorName}</dd>
            </div>
          </dl>

          {hasActions && (
            <div className="wish-details-actions">
              {canToggleStatus && onToggleStatus && item.status !== 'purchased' && (
                <button className="btn btn-sm" onClick={onToggleStatus}>
                  <Icon name={item.status === 'wanted' ? 'lock' : 'unlock'} size={13} />
                  {item.status === 'wanted' ? t('wishlist.reserve') : t('wishlist.unreserve')}
                </button>
              )}
              {canComment && onComments && (
                <button className="btn btn-sm" onClick={onComments}>
                  <Icon name="chat" size={14} />
                  {t('details.comments')}
                </button>
              )}
              {canEdit && onEdit && (
                <button className="btn btn-sm btn-ghost" onClick={onEdit}>
                  <Icon name="edit" size={13} />
                  {t('common.edit')}
                </button>
              )}
              {canDelete && onDelete && (
                <button className="btn btn-sm btn-danger" onClick={onDelete}>
                  <Icon name="trash" size={13} />
                  {t('common.delete')}
                </button>
              )}
            </div>
          )}

          <OffersPanel query={item.title} kind={item.kind} compact />
        </div>
      </div>
    </Modal>
  );
}
