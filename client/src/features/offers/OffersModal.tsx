import { useEffect } from 'react';
import { useSearchOffersMutation } from '../../api/baseApi';
import Modal from '../../components/Modal';
import { useT } from '../../i18n';
import type { Offer, WishItem } from '../../types';

interface OffersModalProps {
  item: WishItem;
  onClose: () => void;
}

function OfferRow({ offer }: { offer: Offer }) {
  const { t } = useT();

  return (
    <a href={offer.url} target="_blank" rel="noreferrer">
      <div className="offers-provider-row">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {offer.imageUrl && (
            <img
              src={offer.imageUrl}
              alt=""
              style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }}
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          )}
          <div>
            <div className="offers-provider-title">{offer.title}</div>
            <div className="offers-provider-meta">
              <span className="offers-provider-name">{offer.provider}</span>
              {offer.rating !== null && <span className="rating-pill">★ {offer.rating.toFixed(1)}/10</span>}
              {offer.ratingSource && <span>({offer.ratingSource})</span>}
              {offer.extra && <span>· {offer.extra}</span>}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {offer.price !== null ? (
            <div className="wish-price">
              {offer.price} {offer.currency}
            </div>
          ) : (
            <div className="faint">{t('offers.noPrice')}</div>
          )}
          <div className="faint">{t('offers.open')} ↗</div>
        </div>
      </div>
    </a>
  );
}

export default function OffersModal({ item, onClose }: OffersModalProps) {
  const { t } = useT();
  const [searchOffers, { data: result, isLoading, error }] = useSearchOffersMutation();

  useEffect(() => {
    void searchOffers({ query: item.title, kind: item.kind });
  }, [item.kind, item.title, searchOffers]);

  const errorMessage =
    error && typeof error === 'object' && 'data' in error
      ? String((error.data as { message?: string }).message ?? '')
      : null;

  const exactOffers = result?.offers.filter((offer) => offer.exact === true) ?? [];
  const otherOffers = result?.offers.filter((offer) => offer.exact !== true) ?? [];

  return (
    <Modal title={t('offers.modalTitle', { title: item.title })} onClose={onClose} large>
      {isLoading && (
        <>
          <div className="spinner" />
          <p className="muted" style={{ textAlign: 'center' }}>
            {t('offers.searching')}
          </p>
        </>
      )}

      {!isLoading && error && <div className="error-banner">{errorMessage}</div>}

      {!isLoading && result && (
        <>
          {result.providersUsed.length > 0 && (
            <p className="faint" style={{ marginBottom: 12 }}>
              {t('offers.sources')}: {result.providersUsed.join(', ')}
            </p>
          )}

          {result.offers.length === 0 && (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <div className="empty-icon">🔍</div>
              <h3>{t('offers.nothingFoundTitle')}</h3>
              <p>{t('offers.nothingFoundText')}</p>
            </div>
          )}

          {exactOffers.length > 0 && (
            <>
              <div className="exact-match-label">{t('offers.exactMatch')}</div>
              {exactOffers.map((offer) => (
                <OfferRow key={offer.id} offer={offer} />
              ))}
              {otherOffers.length > 0 && <div className="exact-match-label muted">{t('offers.similar')}</div>}
            </>
          )}

          {otherOffers.map((offer) => (
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
    </Modal>
  );
}
