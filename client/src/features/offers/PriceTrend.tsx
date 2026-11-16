import { useGetPriceHistoryQuery } from '../../api/baseApi';
import { useT } from '../../i18n';
import { convertAmount, formatMoney, useCurrency } from '../../utils/currency';
import type { WishKind } from '../../types';

interface PriceTrendProps {
  query: string;
  kind: WishKind;
}

const WIDTH = 260;
const HEIGHT = 48;
const PADDING = 3;

export default function PriceTrend({ query, kind }: PriceTrendProps) {
  const { t, formatDate } = useT();
  const { base, rates } = useCurrency();
  const { data, isLoading } = useGetPriceHistoryQuery({ query, kind });

  if (isLoading) return null;

  const points = data?.points ?? [];
  if (points.length < 2) {
    return (
      <div className="price-trend price-trend-empty">
        <span className="price-trend-title">{t('offers.priceHistory')}</span>
        <span className="faint">{t('offers.priceHistoryEmpty')}</span>
      </div>
    );
  }

  const prices = points.map((point) => {
    const converted = convertAmount(point.price, point.currency, base, rates);
    return converted ?? point.price;
  });
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const coords = prices.map((price, index) => {
    const x = (index / (prices.length - 1)) * WIDTH;
    const y = HEIGHT - PADDING - ((price - min) / range) * (HEIGHT - PADDING * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const first = prices[0];
  const last = prices[prices.length - 1];
  const delta = first !== 0 ? ((last - first) / first) * 100 : 0;
  const trend = delta < -0.5 ? 'down' : delta > 0.5 ? 'up' : 'flat';
  const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const goodDeal = last <= average * 0.9;

  return (
    <div className="price-trend" data-testid="price-trend">
      <div className="price-trend-head">
        <span className="price-trend-title">{t('offers.priceHistory')}</span>
        <span className="price-trend-head-right">
          {goodDeal && <span className="price-trend-good">{t('offers.priceGood')}</span>}
          <span className={`price-trend-delta ${trend}`}>
            {delta > 0 ? '+' : ''}
            {delta.toFixed(1)}%
          </span>
        </span>
      </div>

      <svg
        className="price-trend-chart"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={t('offers.priceHistory')}
        preserveAspectRatio="none"
      >
        <polyline
          points={coords.join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="price-trend-meta">
        <span>
          {t('offers.priceMin')}: {formatMoney(min, base)}
        </span>
        <span>
          {t('offers.priceMax')}: {formatMoney(max, base)}
        </span>
        <span className="faint">{formatDate(points[points.length - 1].t)}</span>
      </div>
    </div>
  );
}
