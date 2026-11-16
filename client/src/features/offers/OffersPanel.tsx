import { useCallback, useEffect } from 'react';
import { useSearchOffersMutation } from '../../api/baseApi';
import Icon from '../../components/Icon';
import { useT } from '../../i18n';
import { convertAmount, formatMoney, useCurrency } from '../../utils/currency';
import type { Offer, WishKind } from '../../types';

interface OffersPanelProps {
  query: string;
  kind: WishKind;
  compact?: boolean;
  autoSearch?: boolean;
}

function OfferRow({ offer }: { offer: Offer }) {
  const { t } = useT();
  const { base, rates } = useCurrency();

  const converted =
    offer.price !== null ? convertAmount(offer.price, offer.currency, base, rates) : null;
  const priceLabel =
    offer.price === null
      ? null
      : converted !== null
        ? formatMoney(converted, base)
        : `${offer.price} ${offer.currency}`;

  const hasShipping = offer.shipping !== null && offer.shipping !== undefined && offer.shipping > 0;
  const totalConverted =
    offer.totalPrice !== null && offer.totalPrice !== undefined
      ? convertAmount(offer.totalPrice, offer.currency, base, rates)
      : null;
  const totalLabel =
    hasShipping && offer.totalPrice !== null && offer.totalPrice !== undefined
      ? totalConverted !== null
        ? formatMoney(totalConverted, base)
        : `${offer.totalPrice} ${offer.currency}`
      : null;

  const relevance = offer.relevanceScore ?? offer.matchScore ?? 5;

  return (
    <a
      className="offer-row"
      href={offer.url}
      target="_blank"
      rel="noreferrer"
      data-testid="offer-row"
    >
      <div className="offer-thumb" aria-hidden>
        {offer.imageUrl ? (
          <img
            src={offer.imageUrl}
            alt=""
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <Icon name="cart" size={18} />
        )}
      </div>

      <div className="offer-body">
        <div className="offer-title">{offer.title}</div>
        <div className="offer-meta">
          <span className="offer-provider">{offer.provider}</span>
          {offer.rating !== null && (
            <span className="rating-pill">★ {offer.rating.toFixed(1)}</span>
          )}
          {offer.ratingSource && <span className="faint">{offer.ratingSource}</span>}
          {offer.extra && <span className="faint">{offer.extra}</span>}
          {hasShipping && (
            <span className="faint">
              {t('offers.shipping')}: {offer.shipping} {offer.currency}
            </span>
          )}
          {offer.exact === true && (
            <span className="offer-match exact">{t('offers.matchExact')}</span>
          )}
          {offer.exact !== true && relevance <= 3 && (
            <span className="offer-match">{t('offers.matchClose')}</span>
          )}
        </div>
      </div>

      <div className="offer-price-col">
        {priceLabel ? (
          <span className="wish-price" title={offer.price !== null ? `${offer.price} ${offer.currency}` : undefined}>
            {priceLabel}
          </span>
        ) : (
          <span className="faint">{t('offers.noPrice')}</span>
        )}
        {totalLabel && (
          <span className="faint offer-total">
            {t('offers.totalPrice')}: {totalLabel}
          </span>
        )}
        <span className="offer-open">
          {t('offers.open')} <Icon name="external" size={11} />
        </span>
      </div>
    </a>
  );
}

export default function OffersPanel({
  query,
  kind,
  compact = false,
  autoSearch = true,
}: OffersPanelProps) {
  const { t } = useT();
  const { base, rates } = useCurrency();
  const [searchOffers, { data: result, isLoading, error }] = useSearchOffersMutation();

  const runSearch = useCallback((): void => {
    void searchOffers({ query, kind });
  }, [searchOffers, query, kind]);

  useEffect(() => {
    if (!autoSearch) return;
    void searchOffers({ query, kind });
  }, [autoSearch, searchOffers, query, kind]);

  const errorMessage =
    error && typeof error === 'object' && 'data' in error
      ? String((error.data as { message?: string }).message ?? '')
      : null;

  const offers = result?.offers ?? [];
  const exactOffers = offers.filter((offer) => offer.exact === true);
  const similarOffers = offers.filter((offer) => offer.exact !== true);

  const bestPrice = result?.bestPrice ?? null;
  const bestPriceConverted =
    bestPrice !== null ? convertAmount(bestPrice.price, bestPrice.currency, base, rates) : null;
  const bestPriceLabel =
    bestPrice === null
      ? null
      : bestPriceConverted !== null
        ? formatMoney(bestPriceConverted, base)
        : `${bestPrice.price} ${bestPrice.currency}`;

  return (
    <section
      className={`offers-panel ${compact ? 'offers-panel-compact' : ''}`}
      data-testid="offers-panel"
    >
      <div className="offers-panel-head">
        <div className="offers-panel-heading">
          <Icon name="cart" size={16} />
          <span>{t('offers.panelTitle')}</span>
          {result && <span className="offers-count">{t('offers.found', { count: offers.length })}</span>}
        </div>
        <button
          className="btn btn-sm btn-ghost"
          onClick={runSearch}
          disabled={isLoading}
          title={t('offers.refresh')}
          aria-label={t('offers.refresh')}
        >
          <Icon name="retry" size={14} />
        </button>
      </div>

      {isLoading && (
        <div className="offers-loading" role="status" aria-live="polite">
          <span className="spinner offers-spinner" />
          <span className="muted">{t('offers.searching')}</span>
        </div>
      )}

      {!isLoading && error && <div className="error-banner">{errorMessage || t('offers.error')}</div>}

      {!isLoading && result && (
        <>
          {bestPriceLabel && (
            <div className="offers-best-price">
              <Icon name="wallet" size={15} />
              <span>
                {t('offers.bestPrice')}: <strong>{bestPriceLabel}</strong>
              </span>
              <span className="faint">{bestPrice?.provider}</span>
            </div>
          )}

          {result.providersUsed.length > 0 && (
            <p className="faint offers-sources">
              {t('offers.sources')}: {result.providersUsed.join(', ')}
            </p>
          )}

          {offers.length === 0 && (
            <div className="offers-empty">
              <Icon name="search" size={22} />
              <div>
                <h4>{t('offers.nothingFoundTitle')}</h4>
                <p className="muted">{t('offers.nothingFoundText')}</p>
              </div>
            </div>
          )}

          {exactOffers.length > 0 && (
            <>
              <div className="exact-match-label">{t('offers.exactMatch')}</div>
              {exactOffers.map((offer) => (
                <OfferRow key={offer.id} offer={offer} />
              ))}
              {similarOffers.length > 0 && (
                <div className="exact-match-label muted">{t('offers.similar')}</div>
              )}
            </>
          )}

          {similarOffers.map((offer) => (
            <OfferRow key={offer.id} offer={offer} />
          ))}

          <div className="offers-links">
            <span className="faint" style={{ width: '100%' }}>
              {t('offers.manualSearch')}:
            </span>
            {result.searchLinks.map((link) => (
              <a key={link.name} href={link.url} target="_blank" rel="noreferrer">
                {link.name} ↗
              </a>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
