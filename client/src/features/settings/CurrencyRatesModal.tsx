import { useState } from 'react';
import Modal from '../../components/Modal';
import Icon from '../../components/Icon';
import { useT } from '../../i18n';
import {
  CURRENCIES,
  RATES_TTL_MS,
  clearRateOverrides,
  getRateOverrides,
  setRateOverride,
  useCurrency,
} from '../../utils/currency';

interface CurrencyRatesModalProps {
  onClose: () => void;
}

export default function CurrencyRatesModal({ onClose }: CurrencyRatesModalProps) {
  const { t, formatDateTime } = useT();
  const { rates, fetchedAt, source, stale, refresh } = useCurrency();
  const [overrides, setOverrides] = useState<Record<string, string>>(() => {
    const stored = getRateOverrides();
    return Object.fromEntries(
      CURRENCIES.map((currency) => [currency, stored[currency]?.toString() ?? '']),
    );
  });

  function saveOverride(currency: string): void {
    const raw = overrides[currency]?.trim() ?? '';
    const parsed = raw === '' ? null : Number(raw.replace(',', '.'));
    setRateOverride(currency, parsed !== null && Number.isFinite(parsed) ? parsed : null);
  }

  function resetAll(): void {
    clearRateOverrides();
    setOverrides(Object.fromEntries(CURRENCIES.map((currency) => [currency, ''])));
  }

  return (
    <Modal title={t('currencyRates.title')} onClose={onClose}>
      <div className="rates-meta">
        <span>{t('currencyRates.source', { source: source ?? 'open.er-api.com' })}</span>
        <span>
          {fetchedAt
            ? t('currencyRates.updated', { date: formatDateTime(fetchedAt) })
            : t('currencyRates.never')}
        </span>
      </div>
      {stale && (
        <p className="rates-stale" role="status">
          <Icon name="alert" size={14} /> {t('currencyRates.stale')}
        </p>
      )}
      <p className="muted" style={{ margin: '10px 0 14px' }}>
        {t('currencyRates.hint')}
      </p>

      <div className="rates-list">
        {CURRENCIES.map((currency) => {
          const providerRate = rates?.rates[currency];
          return (
            <div key={currency} className="rates-row">
              <div className="rates-code">
                <strong>{currency}</strong>
                <span className="muted">
                  {providerRate ? providerRate.toFixed(4) : '—'}
                </span>
              </div>
              <label className="rates-input">
                <span className="sr-only">{t('currencyRates.override')}</span>
                <input
                  className="input"
                  inputMode="decimal"
                  value={overrides[currency] ?? ''}
                  placeholder={t('currencyRates.overridePlaceholder')}
                  onChange={(event) =>
                    setOverrides((current) => ({ ...current, [currency]: event.target.value }))
                  }
                  onBlur={() => saveOverride(currency)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') saveOverride(currency);
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>

      <p className="muted" style={{ fontSize: 12 }}>
        {t('currencyRates.ttl', { hours: Math.round(RATES_TTL_MS / 3_600_000) })}
      </p>

      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={resetAll}>
          {t('currencyRates.reset')}
        </button>
        <button type="button" className="btn" onClick={refresh}>
          <Icon name="retry" size={14} />
          {t('currencyRates.refresh')}
        </button>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </Modal>
  );
}
