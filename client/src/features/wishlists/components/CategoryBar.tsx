import { useState } from 'react';
import CategoryPresetModal from './CategoryPresetModal';
import Icon from '../../../components/Icon';
import { useT } from '../../../i18n';
import type { CurrencyTotal } from '../useMarketPrices';
import type { Category } from '../../../types';

interface CategoryBarProps {
  categories: Category[];

  selected: string[];
  onSelect: (categoryIds: string[]) => void;
  canManage: boolean;

  totals?: Map<string, CurrencyTotal[]>;
  onAdd: (name: string, color: string) => Promise<void> | void;
  onDelete: (categoryId: string) => void;
  busy?: boolean;
}


export default function CategoryBar({
  categories,
  selected,
  onSelect,
  canManage,
  totals,
  onAdd,
  onDelete,
  busy = false,
}: CategoryBarProps) {
  const { t, lang } = useT();
  const [presetOpen, setPresetOpen] = useState(false);

  function totalText(categoryId: string): string | null {
    const total = totals?.get(categoryId);
    if (!total || total.length === 0) return null;
    return total
      .slice(0, 2)
      .map(
        (entry) =>
          `${entry.sum.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 0 })} ${entry.currency}`,
      )
      .join(' · ');
  }

  return (
    <div className="category-bar">
      <button
        className={`category-chip ${selected.length === 0 ? 'active' : ''}`}
        onClick={() => onSelect([])}
      >
        <Icon name="sparkles" size={14} />
        {t('wishlist.categoriesAll')}
      </button>

      {categories.map((category) => {
        const total = totalText(category.id);
        const isActive = selected.includes(category.id);
        return (
          <span key={category.id} style={{ position: 'relative', display: 'inline-flex' }}>
            <button
              className={`category-chip ${isActive ? 'active' : ''}`}
              style={{ ['--chip-color' as string]: category.color }}
              onClick={() =>
                onSelect(isActive ? selected.filter((id) => id !== category.id) : [...selected, category.id])
              }
            >
              <span className="category-chip-inner">
                <span className="chip-top">
                  <span className="badge-dot" style={{ background: category.color }} />
                  {category.name}
                </span>
                {total && <span className="cat-total">{total}</span>}
              </span>
            </button>
            {canManage && (
              <button
                onClick={() => onDelete(category.id)}
                title={t('wishlist.deleteCategory')}
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 18,
                  height: 18,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  border: '1px solid var(--line-strong)',
                  background: 'var(--white)',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                }}
              >
                <Icon name="close" size={11} />
              </button>
            )}
          </span>
        );
      })}

      {canManage && !presetOpen && (
        <button className="category-chip" onClick={() => setPresetOpen(true)}>
          <Icon name="plus" size={14} />
          {t('wishlist.addCategory')}
        </button>
      )}

      {canManage && presetOpen && (
        <CategoryPresetModal
          onAdd={onAdd}
          onClose={() => setPresetOpen(false)}
          busy={busy}
        />
      )}
    </div>
  );
}
