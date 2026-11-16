import { useEffect, useRef, useState, type FormEvent } from 'react';
import Modal from '../../../components/Modal';
import { useResolveLinkQuery, useUploadImageMutation } from '../../../api/baseApi';
import { useT } from '../../../i18n';
import { detectKind } from '../../../utils/detect-kind';
import { toFormValue } from '../../../utils/item-form';
import { convertAmount, useCurrency } from '../../../utils/currency';
import {
  type Category,
  type ItemFormValue,
  type Priority,
  type WishItem,
  type ItemStatus,
} from '../../../types';

const CURRENCIES = ['USD', 'EUR', 'RUB', 'BYN'] as const;

interface ItemFormModalProps {
  title: string;
  initial?: WishItem | null;
  categories: Category[];
  onSubmit: (value: ItemFormValue) => void;
  onClose: () => void;
}

export default function ItemFormModal({
  title,
  initial = null,
  categories,
  onSubmit,
  onClose,
}: ItemFormModalProps) {
  const { t } = useT();
  const { rates } = useCurrency();
  const [value, setValue] = useState<ItemFormValue>(toFormValue(initial));
  const [uploadImage, { isLoading: uploading }] = useUploadImageMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);


  const linkLooksLikeProduct = /^https?:\/\/.+\..+/.test(value.link);
  const { data: resolved, isFetching: resolving } = useResolveLinkQuery(value.link, {
    skip: !linkLooksLikeProduct,
  });
  const resolvedApplied = useRef(false);
  useEffect(() => {
    if (!resolved || resolvedApplied.current) return;
    resolvedApplied.current = true;
    setValue((prev) => ({
      ...prev,
      title: prev.title || resolved.title,
      imageUrl: prev.imageUrl || resolved.imageUrl || '',

      price:
        resolved.currency !== null && resolved.currency !== undefined && resolved.price !== null
          ? (prev.price ?? resolved.price)
          : prev.price,
      currency: resolved.currency ?? prev.currency,
    }));
  }, [resolved]);

  function update<K extends keyof ItemFormValue>(key: K, val: ItemFormValue[K]): void {
    setValue((prev) => ({ ...prev, [key]: val }));
  }

  function handleCurrencyChange(nextCurrency: string): void {
    setValue((prev) => {
      if (prev.price === null || !Number.isFinite(prev.price)) {
        return { ...prev, currency: nextCurrency };
      }
      const converted = convertAmount(prev.price, prev.currency, nextCurrency, rates);
      return {
        ...prev,
        currency: nextCurrency,
        price: converted !== null ? Math.round(converted * 100) / 100 : prev.price,
      };
    });
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadImage(file).unwrap();
      update('imageUrl', result.url);
    } catch {
      alert(t('form.uploadError'));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    if (!value.title.trim()) return;
    onSubmit({
      ...value,
      title: value.title.trim(),
      price: value.price !== null && Number.isFinite(value.price) ? value.price : null,

      kind: detectKind(value.title, value.categoryId, categories),
    });
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="item-title">{t('form.titleField')} *</label>
          <input
            id="item-title"
            className="input"
            value={value.title}
            onChange={(event) => update('title', event.target.value)}
            placeholder={t('form.titlePlaceholder')}
            autoFocus
            required
          />
        </div>

        <div className="field">
          <label htmlFor="item-desc">{t('form.description')}</label>
          <textarea
            id="item-desc"
            className="textarea"
            value={value.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder={t('form.descriptionPlaceholder')}
          />
        </div>

        <div className="field">
          <label htmlFor="item-category">{t('form.category')}</label>
          <select
            id="item-category"
            className="select"
            value={value.categoryId ?? ''}
            onChange={(event) => update('categoryId', event.target.value || null)}
          >
            <option value="">{t('form.noCategory')}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="item-price">{t('form.price')}</label>
            <input
              id="item-price"
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={value.price ?? ''}
              onChange={(event) =>
                update('price', event.target.value === '' ? null : Number(event.target.value))
              }
              placeholder={t('form.pricePlaceholder')}
            />
          </div>
          <div className="field">
            <label htmlFor="item-currency">{t('form.currency')}</label>
            <select
              id="item-currency"
              className="select"
              value={value.currency}
              onChange={(event) => handleCurrencyChange(event.target.value)}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="item-link">{t('form.link')}</label>
          <input
            id="item-link"
            className="input"
            value={value.link}
            onChange={(event) => update('link', event.target.value)}
            placeholder={t('form.linkPlaceholder')}
          />
          {linkLooksLikeProduct && resolving ? (
            <p className="field-hint">{t('form.resolving')}</p>
          ) : (
            <p className="field-hint">{t('form.linkHint')}</p>
          )}
        </div>

        <div className="field">
          <label htmlFor="item-image">{t('form.image')}</label>
          <input
            id="item-image"
            className="input"
            value={value.imageUrl}
            onChange={(event) => update('imageUrl', event.target.value)}
            placeholder={t('form.imagePlaceholder')}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? t('form.uploading') : `📁 ${t('form.upload')}`}
            </button>
            {value.imageUrl && <img src={value.imageUrl} alt="" style={{ height: 40, borderRadius: 8 }} />}
            <span className="faint">{t('form.uploadHint')}</span>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="item-priority">{t('form.priority')}</label>
            <select
              id="item-priority"
              className="select"
              value={value.priority}
              onChange={(event) => update('priority', event.target.value as Priority)}
            >
              {(['low', 'medium', 'high'] as Priority[]).map((priority) => (
                <option key={priority} value={priority}>
                  {t(`wishlist.priority${priority.charAt(0).toUpperCase()}${priority.slice(1)}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="item-status">{t('form.status')}</label>
            <select
              id="item-status"
              className="select"
              value={value.status}
              onChange={(event) => update('status', event.target.value as ItemStatus)}
            >
              {(['wanted', 'reserved', 'purchased'] as ItemStatus[]).map((status) => (
                <option key={status} value={status}>
                  {t(`statuses.${status}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn btn-primary">
            {t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
