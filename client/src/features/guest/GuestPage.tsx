import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import ProgressiveGrid from '../../components/ProgressiveGrid';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import ViewToggle from '../../components/ViewToggle';
import ContextMenu from '../../components/ContextMenu';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Icon from '../../components/Icon';
import EmptyIllustration from '../../components/EmptyIllustration';
import {
  addCategory,
  addItem,
  moveItem,
  removeCategory,
  removeItem,
  replaceGuestState,
  selectGuestCategories,
  selectGuestItems,
  updateItem,
} from './guestSlice';
import { exportGuestJson, importGuestJson } from './guestPersistence';
import { useDialog } from '../../components/DialogProvider';
import CategoryBar from '../wishlists/components/CategoryBar';
import ItemFormModal from '../wishlists/components/ItemFormModal';
import WishItemCard from '../wishlists/components/WishItemCard';
import WishItemRow from '../wishlists/components/WishItemRow';
import WishDetailsModal from '../wishlists/components/WishDetailsModal';
import OffersModal from '../offers/OffersModal';
import { selectViewMode } from '../ui/uiSlice';
import { useT } from '../../i18n';
import { PRIORITY_KEYS } from '../../i18n/labels';
import { computeCategoryTotals, useMarketPrices } from '../wishlists/useMarketPrices';
import { useCurrency } from '../../utils/currency';
import { groupAndSortByPriority, priorityRank, type SortMode } from '../../utils/priority';
import { PRIORITY_ICONS } from '../../utils/item-icons';
import type { ItemFormValue, WishItem } from '../../types';

interface ContextMenuState {
  x: number;
  y: number;
  item: WishItem;
}

export default function GuestPage() {
  const dispatch = useAppDispatch();
  const { t } = useT();
  const { alert: showAlert } = useDialog();
  const items = useAppSelector(selectGuestItems);
  const categories = useAppSelector(selectGuestCategories);
  const viewMode = useAppSelector(selectViewMode);

  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WishItem | null>(null);
  const [offersItem, setOffersItem] = useState<WishItem | null>(null);
  const [detailsItem, setDetailsItem] = useState<WishItem | null>(null);
  const [contextItem, setContextItem] = useState<ContextMenuState | null>(null);
  const draggedIdRef = useRef<string | null>(null);
  const targetIdRef = useRef<string | null>(null);

  const filteredItems = useMemo(
    () =>
      categoryFilter.length === 0
        ? items
        : items.filter(
            (item) => item.categoryId !== null && categoryFilter.includes(item.categoryId),
          ),
    [items, categoryFilter],
  );

  const searchedItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return filteredItems;
    return filteredItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query) || item.description.toLowerCase().includes(query),
    );
  }, [filteredItems, searchQuery]);

  const { base, rates } = useCurrency();
  const market = useMarketPrices();
  const categoryTotals = useMemo(
    () => computeCategoryTotals(searchedItems, market, base, rates),
    [market, searchedItems, base, rates],
  );

  const groupedItems = useMemo(
    () => groupAndSortByPriority(searchedItems, sortMode),
    [searchedItems, sortMode],
  );

  const detailsCurrent = detailsItem
    ? (items.find((item) => item.id === detailsItem.id) ?? detailsItem)
    : null;

  const categoryById = (categoryId: string | null) =>
    categoryId ? (categories.find((category) => category.id === categoryId) ?? null) : null;

  const priorityById = useMemo(
    () => new Map(items.map((item) => [item.id, item.priority] as const)),
    [items],
  );

  function handleDragStart(itemId: string): void {
    draggedIdRef.current = itemId;
  }

  function handleDragEnter(targetId: string): void {
    targetIdRef.current = targetId;
    const draggedId = draggedIdRef.current;
    if (!draggedId || draggedId === targetId) return;
    dispatch(moveItem({ fromId: draggedId, toId: targetId }));
  }

  function handleDragEnd(): void {
    const draggedId = draggedIdRef.current;
    const targetId = targetIdRef.current;
    if (draggedId && targetId && draggedId !== targetId) {
      const fromPriority = priorityById.get(draggedId);
      const toPriority = priorityById.get(targetId);
      if (fromPriority && toPriority && priorityRank(fromPriority) !== priorityRank(toPriority)) {
        dispatch(updateItem({ id: draggedId, patch: { priority: toPriority } }));
      }
    }
    draggedIdRef.current = null;
    targetIdRef.current = null;
  }

  function moveItemByKeyboard(itemId: string, direction: -1 | 1): void {
    const base = searchedItems.map((item) => item.id);
    const fromIndex = base.indexOf(itemId);
    const toIndex = fromIndex + direction;
    if (fromIndex === -1 || toIndex < 0 || toIndex >= base.length) return;
    dispatch(moveItem({ fromId: itemId, toId: base[toIndex] }));
  }

  function duplicateItem(item: WishItem): void {
    dispatch(
      addItem({
        title: `${item.title} (${t('common.copySuffix')})`,
        description: item.description,
        link: item.link,
        imageUrl: item.imageUrl,
        categoryId: item.categoryId,
        price: item.price,
        currency: item.currency,
        priority: item.priority,
        kind: item.kind,
        status: 'wanted',
      }),
    );
  }

  function handleSubmit(value: ItemFormValue): void {
    if (editing) dispatch(updateItem({ id: editing.id, patch: value }));
    else dispatch(addItem(value));
    setFormOpen(false);
    setEditing(null);
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      dispatch(replaceGuestState(await importGuestJson(file)));
    } catch {
      await showAlert({ title: t('common.errorTitle'), message: t('guest.importError') });
    }
  }

  function toggleStatus(item: WishItem): void {
    dispatch(
      updateItem({
        id: item.id,
        patch: {
          status:
            item.status === 'wanted'
              ? 'reserved'
              : item.status === 'reserved'
                ? 'wanted'
                : 'purchased',
        },
      }),
    );
  }

  function deleteItem(item: WishItem): void {
    dispatch(removeItem(item.id));
    setDetailsItem((current) => (current?.id === item.id ? null : current));
  }

  function openContextMenu(event: React.MouseEvent, item: WishItem): void {
    setContextItem({ x: event.clientX, y: event.clientY, item });
  }

  return (
    <div className="page" onClick={() => setContextItem(null)}>
      <Header guestMode />

      <main className="main">
        <div className="container">
          <div className="success-note">
            {t('guest.banner')}{' '}
            <Link to="/register" style={{ color: 'var(--peach-deep)', fontWeight: 700 }}>
              {t('guest.registerLink')}
            </Link>
          </div>

          <div className="wishlist-toolbar">
            <div className="left">
              <h1 className="wishlist-title">{t('guest.title')}</h1>
              <ViewToggle />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-sm" onClick={() => exportGuestJson({ items, categories })}>
                <Icon name="download" size={14} />
                {t('guest.exportJson')}
              </button>
              <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
                <Icon name="upload" size={14} />
                {t('guest.importJson')}
                <input
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={(event) => void handleImportFile(event)}
                />
              </label>
              <button
                className="btn btn-accent mobile-fab"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Icon name="plus" size={16} />
                {t('wishlist.addWish')}
              </button>
            </div>
          </div>

          <CategoryBar
            categories={categories}
            selected={categoryFilter}
            onSelect={setCategoryFilter}
            canManage
            totals={categoryTotals}
            onAdd={(name, color) => {
              dispatch(addCategory({ name, color }));
            }}
            onDelete={(categoryId) => dispatch(removeCategory(categoryId))}
          />

          <div className="search-row">
            <div className="search-field">
              <Icon name="search" size={16} className="search-field-icon" />
              <input
                className="input"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('wishlist.searchPlaceholder')}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear"
                  aria-label={t('common.close')}
                  onClick={() => setSearchQuery('')}
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="filter-bar">
            <div className="filter-select">
              <Icon name="chart" size={15} />
              <select
                className="select"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                aria-label={t('filters.sort')}
              >
                <option value="default">{t('filters.sortDefault')}</option>
                <option value="price-asc">{t('filters.sortPriceAsc')}</option>
                <option value="price-desc">{t('filters.sortPriceDesc')}</option>
                <option value="title-asc">{t('filters.sortTitle')}</option>
              </select>
              <Icon name="chevron-down" size={14} className="filter-caret" />
            </div>
          </div>

          {groupedItems.length === 0 && (
            <div className="empty-state">
              <EmptyIllustration
                icon={categoryFilter.length > 0 || searchQuery.trim() ? 'search' : 'gift'}
                tone={categoryFilter.length > 0 || searchQuery.trim() ? 'sage' : 'peach'}
              />
              <h3>
                {categoryFilter.length > 0 || searchQuery.trim()
                  ? t('wishlist.emptyFiltered')
                  : t('wishlist.emptyTitle')}
              </h3>
              <p>{t('wishlist.emptyText')}</p>
            </div>
          )}

          {groupedItems.map((group) => (
            <section key={group.priority} className="priority-group">
              <div className="priority-group-title" data-priority={group.priority}>
                <span className="priority-icon">
                  <Icon name={PRIORITY_ICONS[group.priority]} size={14} />
                </span>
                {t(PRIORITY_KEYS[group.priority])}
                <span className="priority-count">{group.items.length}</span>
              </div>

              {viewMode === 'cards' ? (
                <ProgressiveGrid
                  items={group.items}
                  className="items-grid"
                  renderItem={(item) => (
                    <WishItemCard
                      key={item.id}
                      item={item}
                      category={categoryById(item.categoryId)}
                      canDelete
                      canToggleStatus
                      dragging={draggedIdRef.current === item.id}
                      draggable={sortMode === 'default'}
                      onOpen={() => setDetailsItem(item)}
                      onEdit={() => {
                        setEditing(item);
                        setFormOpen(true);
                      }}
                      onDelete={() => deleteItem(item)}
                      onOffers={() => setOffersItem(item)}
                      onToggleStatus={() => toggleStatus(item)}
                      onContextMenu={(event) => openContextMenu(event, item)}
                      onDragStart={() => handleDragStart(item.id)}
                      onDragEnter={() => handleDragEnter(item.id)}
                      onDragEnd={handleDragEnd}
                      onKeyboardMove={(direction) => moveItemByKeyboard(item.id, direction)}
                    />
                  )}
                />
              ) : (
                <div className="wish-rows">
                  {group.items.map((item) => (
                    <WishItemRow
                      key={item.id}
                      item={item}
                      category={categoryById(item.categoryId)}
                      canDelete
                      dragging={draggedIdRef.current === item.id}
                      draggable={sortMode === 'default'}
                      onOpen={() => setDetailsItem(item)}
                      onEdit={() => {
                        setEditing(item);
                        setFormOpen(true);
                      }}
                      onDelete={() => deleteItem(item)}
                      onOffers={() => setOffersItem(item)}
                      onContextMenu={(event) => openContextMenu(event, item)}
                      onDragStart={() => handleDragStart(item.id)}
                      onDragEnter={() => handleDragEnter(item.id)}
                      onDragEnd={handleDragEnd}
                      onKeyboardMove={(direction) => moveItemByKeyboard(item.id, direction)}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}

          {formOpen && (
            <ItemFormModal
              title={editing ? t('wishlist.editWish') : t('wishlist.newWish')}
              initial={editing}
              categories={categories}
              onSubmit={handleSubmit}
              onClose={() => {
                setFormOpen(false);
                setEditing(null);
              }}
            />
          )}

          {detailsCurrent && (
            <WishDetailsModal
              item={detailsCurrent}
              category={categoryById(detailsCurrent.categoryId)}
              canDelete
              canToggleStatus
              canEdit
              onClose={() => setDetailsItem(null)}
              onEdit={() => {
                setEditing(detailsCurrent);
                setDetailsItem(null);
                setFormOpen(true);
              }}
              onDelete={() => deleteItem(detailsCurrent)}
              onToggleStatus={() => toggleStatus(detailsCurrent)}
            />
          )}

          {offersItem && <OffersModal item={offersItem} onClose={() => setOffersItem(null)} />}

          {contextItem && (
            <ContextMenu
              x={contextItem.x}
              y={contextItem.y}
              onClose={() => setContextItem(null)}
              items={[
                {
                  label: t('common.edit'),
                  icon: <Icon name="edit" size={15} />,
                  onSelect: () => {
                    setEditing(contextItem.item);
                    setFormOpen(true);
                  },
                },
                {
                  label: t('common.duplicate'),
                  icon: <Icon name="copy" size={15} />,
                  onSelect: () => duplicateItem(contextItem.item),
                },
                {
                  label: t('common.delete'),
                  icon: <Icon name="trash" size={15} />,
                  danger: true,
                  onSelect: () => dispatch(removeItem(contextItem.item.id)),
                },
              ]}
            />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
