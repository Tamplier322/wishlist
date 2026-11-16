import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import ViewToggle from '../../components/ViewToggle';
import ContextMenu from '../../components/ContextMenu';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import {
  addCategory,
  addItem,
  moveItem,
  removeCategory,
  removeItem,
  selectGuestCategories,
  selectGuestItems,
  updateItem,
} from './guestSlice';
import CategoryBar from '../wishlists/components/CategoryBar';
import ItemFormModal from '../wishlists/components/ItemFormModal';
import WishItemCard from '../wishlists/components/WishItemCard';
import WishItemRow from '../wishlists/components/WishItemRow';
import OffersModal from '../offers/OffersModal';
import { selectViewMode } from '../ui/uiSlice';
import { useT } from '../../i18n';
import { computeCategoryTotals, useMarketPrices } from '../wishlists/useMarketPrices';
import { useCurrency } from '../../utils/currency';
import { groupByPriority, priorityRank } from '../../utils/priority';
import type { ItemFormValue, Priority, WishItem } from '../../types';

interface ContextMenuState {
  x: number;
  y: number;
  item: WishItem;
}


export default function GuestPage() {
  const dispatch = useAppDispatch();
  const { t } = useT();
  const items = useAppSelector(selectGuestItems);
  const categories = useAppSelector(selectGuestCategories);
  const viewMode = useAppSelector(selectViewMode);

  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WishItem | null>(null);
  const [offersItem, setOffersItem] = useState<WishItem | null>(null);
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
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query),
    );
  }, [filteredItems, searchQuery]);

  const { base, rates } = useCurrency();
  const market = useMarketPrices();
  const categoryTotals = useMemo(
    () => computeCategoryTotals(searchedItems, market, base, rates),
    [market, searchedItems, base, rates],
  );

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
    const draggedPriority: Priority = priorityById.get(draggedId) ?? 'medium';
    if (priorityRank(draggedPriority) !== priorityRank(priorityById.get(targetId) ?? 'medium')) {
      return;
    }
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
            <button
              className="btn btn-accent"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              + {t('wishlist.addWish')}
            </button>
          </div>

          <CategoryBar
            categories={categories}
            selected={categoryFilter}
            onSelect={setCategoryFilter}
            canManage
            totals={categoryTotals}
            onAdd={(name, color) => dispatch(addCategory({ name, color }))}
            onDelete={(categoryId) => dispatch(removeCategory(categoryId))}
          />

          <div className="search-row">
            <input
              className="input"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('wishlist.searchPlaceholder')}
            />
            {searchQuery && (
              <button className="btn btn-sm btn-ghost" onClick={() => setSearchQuery('')}>
                ✕
              </button>
            )}
          </div>

          {searchedItems.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">✨</div>
              <h3>{categoryFilter ? t('wishlist.emptyFiltered') : t('wishlist.emptyTitle')}</h3>
              <p>{t('wishlist.emptyText')}</p>
            </div>
          )}

          {groupByPriority(searchedItems).map((group) => (
            <section key={group.priority} className="priority-group">
              <div className="priority-group-title" data-priority={group.priority}>
                <span
                  className="badge-dot"
                  style={{ background: `var(--priority-${group.priority})` }}
                />
                {t(
                  `wishlist.priority${group.priority.charAt(0).toUpperCase()}${group.priority.slice(1)}`,
                )}
              </div>

              {viewMode === 'cards' ? (
                <div className="items-grid">
                  {group.items.map((item) => (
                    <WishItemCard
                      key={item.id}
                      item={item}
                      category={categoryById(item.categoryId)}
                      canDelete
                      canToggleStatus
                      dragging={draggedIdRef.current === item.id}
                      onEdit={() => {
                        setEditing(item);
                        setFormOpen(true);
                      }}
                      onDelete={() => dispatch(removeItem(item.id))}
                      onOffers={() => setOffersItem(item)}
                      onToggleStatus={() =>
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
                        )
                      }
                      onContextMenu={(event) => openContextMenu(event, item)}
                      onDragStart={() => handleDragStart(item.id)}
                      onDragEnter={() => handleDragEnter(item.id)}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </div>
              ) : (
                <div className="wish-rows">
                  {group.items.map((item) => (
                    <WishItemRow
                      key={item.id}
                      item={item}
                      category={categoryById(item.categoryId)}
                      canDelete
                      dragging={draggedIdRef.current === item.id}
                      onEdit={() => {
                        setEditing(item);
                        setFormOpen(true);
                      }}
                      onDelete={() => dispatch(removeItem(item.id))}
                      onOffers={() => setOffersItem(item)}
                      onContextMenu={(event) => openContextMenu(event, item)}
                      onDragStart={() => handleDragStart(item.id)}
                      onDragEnter={() => handleDragEnter(item.id)}
                      onDragEnd={handleDragEnd}
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

          {offersItem && <OffersModal item={offersItem} onClose={() => setOffersItem(null)} />}

          {contextItem && (
            <ContextMenu
              x={contextItem.x}
              y={contextItem.y}
              onClose={() => setContextItem(null)}
              items={[
                {
                  label: t('common.edit'),
                  icon: '✏️',
                  onSelect: () => {
                    setEditing(contextItem.item);
                    setFormOpen(true);
                  },
                },
                {
                  label: t('common.duplicate'),
                  icon: '📄',
                  onSelect: () => duplicateItem(contextItem.item),
                },
                {
                  label: t('common.delete'),
                  icon: '🗑️',
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
