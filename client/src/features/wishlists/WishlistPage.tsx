import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useAddItemMutation,
  useAddCategoryMutation,
  useDeleteCategoryMutation,
  useDeleteItemMutation,
  useGetWishlistContentQuery,
  usePatchItemMutation,
  useRemoveMemberMutation,
  useReorderItemsMutation,
  useUpdateItemMutation,
  useUpdateWishlistMutation,
} from '../../api/baseApi';
import { useAppDispatch, useAppSelector, useAuthStatus } from '../../app/hooks';
import { pushEvent } from '../notifications/notificationsSlice';
import ViewToggle from '../../components/ViewToggle';
import ContextMenu from '../../components/ContextMenu';
import Modal from '../../components/Modal';
import { useT } from '../../i18n';
import { useWishlistSocket } from './useWishlistSocket';
import CategoryBar from './components/CategoryBar';
import CommentsModal from './components/CommentsModal';
import ImportExportModal from './components/ImportExportModal';
import ItemFormModal from './components/ItemFormModal';
import MembersBar from './components/MembersBar';
import WishItemCard from './components/WishItemCard';
import WishItemRow from './components/WishItemRow';
import OffersModal from '../offers/OffersModal';
import { WishRowsVirtual } from './components/WishRowsVirtual';
import { useWishlistItemsEntity, wishlistItemsSelectors } from './itemsEntity';
import { selectViewMode } from '../ui/uiSlice';
import { computeCategoryTotals, useMarketPrices } from './useMarketPrices';
import { toFormValue } from '../../utils/item-form';
import { getBaseCurrency, useCurrency } from '../../utils/currency';
import { groupByPriority, priorityRank } from '../../utils/priority';
import type { ItemFormValue, Priority, WishItem } from '../../types';

type StatusFilter = 'all' | 'wanted' | 'reserved' | 'purchased';
type SortMode = 'default' | 'price-asc' | 'price-desc' | 'priority';

interface ContextMenuState {
  x: number;
  y: number;
  item: WishItem;
}


export default function WishlistPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStatus();
  const { t } = useT();
  const viewMode = useAppSelector(selectViewMode);
  const dispatch = useAppDispatch();

  const {
    data: content,
    isLoading,
    isError,
    refetch,
  } = useGetWishlistContentQuery(id ?? '', {
    skip: !id,
  });

  const [addItem] = useAddItemMutation();
  const [updateItem] = useUpdateItemMutation();
  const [patchItem] = usePatchItemMutation();
  const [deleteItem] = useDeleteItemMutation();
  const [addCategory] = useAddCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();
  const [updateWishlist] = useUpdateWishlistMutation();
  const [removeMember] = useRemoveMemberMutation();
  const [reorderItems] = useReorderItemsMutation();

  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WishItem | null>(null);
  const [offersItem, setOffersItem] = useState<WishItem | null>(null);
  const [commentsItem, setCommentsItem] = useState<WishItem | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [deadlineValue, setDeadlineValue] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [order, setOrder] = useState<string[] | null>(null);

  const draggedIdRef = useRef<string | null>(null);
  const targetIdRef = useRef<string | null>(null);
  const deadlineReminderShownRef = useRef(false);
  const userIdRef = useRef<string | undefined>(user?.id);
  userIdRef.current = user?.id;

  useWishlistSocket(id, content?.wishlist.ownerId, userIdRef);

  const items = useMemo(() => content?.items ?? [], [content]);
  const categories = useMemo(() => content?.categories ?? [], [content]);

  const categoryFiltered = useMemo(
    () =>
      categoryFilter.length === 0
        ? items
        : items.filter((item) => item.categoryId !== null && categoryFilter.includes(item.categoryId)),
    [items, categoryFilter],
  );

  const statusFiltered = useMemo(
    () =>
      statusFilter === 'all'
        ? categoryFiltered
        : categoryFiltered.filter((item) => item.status === statusFilter),
    [categoryFiltered, statusFilter],
  );

  const priorityById = useMemo(
    () => new Map(items.map((item) => [item.id, item.priority] as const)),
    [items],
  );

  const searchedItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return statusFiltered;
    return statusFiltered.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query),
    );
  }, [statusFiltered, searchQuery]);

  const { base, rates } = useCurrency();
  const market = useMarketPrices();
  const categoryTotals = useMemo(
    () => computeCategoryTotals(searchedItems, market, base, rates),
    [market, searchedItems, base, rates],
  );

  const sortedItems = useMemo(() => {
    const list = [...searchedItems];
    switch (sortMode) {
      case 'price-asc':
        list.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
        break;
      case 'price-desc':
        list.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
        break;
      case 'priority': {
        const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
        list.sort((a, b) => rank[a.priority] - rank[b.priority]);
        break;
      }
      default:
        break;
    }
    return list;
  }, [searchedItems, sortMode]);


  const itemsEntity = useWishlistItemsEntity(sortedItems);
  const getItemById = (itemId: string) => wishlistItemsSelectors.selectById(itemsEntity, itemId);

  const displayItems = useMemo(() => {
    if (!order) return sortedItems;
    const byId = new Map(sortedItems.map((item) => [item.id, item]));
    const ordered = order.map((itemId) => byId.get(itemId)).filter((item) => item !== undefined);
    const rest = sortedItems.filter((item) => !order.includes(item.id));
    return [...ordered, ...rest];
  }, [order, sortedItems]);

  const isOwner = content !== undefined && user !== null && content.wishlist.ownerId === user.id;

  const canToggleItemStatus = (item: WishItem): boolean =>
    user !== null && (item.status === 'wanted' || isOwner || item.reservedBy === user.id);

  const categoryById = (categoryId: string | null) =>
    categoryId ? (categories.find((category) => category.id === categoryId) ?? null) : null;


  const daysLeft = useMemo(() => {
    if (!content?.wishlist.deadline) return null;
    const diff = new Date(content.wishlist.deadline).getTime() - Date.now();
    return Math.ceil(diff / 86_400_000);
  }, [content?.wishlist.deadline]);

  useEffect(() => {
    if (daysLeft === null || daysLeft > 7 || deadlineReminderShownRef.current) return;
    deadlineReminderShownRef.current = true;
    dispatch(pushEvent({ text: t('deadline.soon'), kind: 'info' }));
  }, [daysLeft, dispatch, t]);

  function handleSubmit(value: ItemFormValue): void {
    if (editing) {
      void updateItem({ itemId: editing.id, value });
    } else if (id) {
      void addItem({ wishlistId: id, value });
    }
    setFormOpen(false);
    setEditing(null);
  }

  function handleShareToggle(): void {
    if (!id || !content) return;
    void updateWishlist({ id, patch: { isShared: !content.wishlist.isShared } });
  }

  function handleDeadlineSave(): void {
    if (!id) return;
    void updateWishlist({ id, patch: { deadline: deadlineValue || null } });
    setDeadlineOpen(false);
  }

  function handleToggleReserve(item: WishItem): void {
    const nextStatus =
      item.status === 'wanted' ? 'reserved' : item.status === 'reserved' ? 'wanted' : 'purchased';
    void updateItem({
      itemId: item.id,
      value: { ...toFormValue(item), status: nextStatus },
    });
  }

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

    setOrder((prev) => {
      const base = prev ?? searchedItems.map((item) => item.id);
      const fromIndex = base.indexOf(draggedId);
      const toIndex = base.indexOf(targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const next = [...base];
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, draggedId);
      return next;
    });
  }

  function handleDragEnd(): void {
    const draggedId = draggedIdRef.current;
    const targetId = targetIdRef.current;

    if (draggedId && targetId && draggedId !== targetId) {
      const fromPriority = priorityById.get(draggedId);
      const toPriority = priorityById.get(targetId);
      if (fromPriority && toPriority && priorityRank(fromPriority) !== priorityRank(toPriority)) {
        void patchItem({ itemId: draggedId, patch: { priority: toPriority } });
        draggedIdRef.current = null;
        targetIdRef.current = null;
        return;
      }
    }

    if (order && draggedId && id) {
      void reorderItems({ wishlistId: id, order });
    }
    draggedIdRef.current = null;
    targetIdRef.current = null;
  }

  function duplicateItem(item: WishItem): void {
    const source = getItemById(item.id) ?? item;
    void addItem({
      wishlistId: item.wishlistId,
      value: {
        ...toFormValue(source),
        title: `${source.title} (${t('common.copySuffix')})`,
        status: 'wanted',
      },
    });
  }

  function handleImport(lines: string[]): void {
    if (!id) return;
    lines.forEach((line) => {
      const [title, pricePart, currencyPart] = line.split('|').map((part) => part.trim());
      const price = pricePart !== undefined && pricePart !== '' && !Number.isNaN(Number(pricePart)) ? Number(pricePart) : null;
      void addItem({
        wishlistId: id,
        value: {
          title,
          description: '',
          link: '',
          imageUrl: '',
          categoryId: null,
          price,
          currency: currencyPart ?? getBaseCurrency(),
          priority: 'medium',
          kind: 'other',
          status: 'wanted',
        },
      });
    });
  }

  function exportAsText(): void {
    const text = items
      .map((item) => `${item.title}${item.price !== null ? ` | ${item.price} ${item.currency}` : ''}`)
      .join('\n');
    void navigator.clipboard.writeText(text);
  }

  function exportAsPng(): void {
    if (!content) return;
    const width = 900;
    const rowHeight = 46;
    const height = 140 + items.length * rowHeight + 60;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#faf8f4';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#2b2822';
    ctx.font = '800 34px Inter, sans-serif';
    ctx.fillText(content.wishlist.name, 40, 70);
    ctx.font = '500 16px Inter, sans-serif';
    ctx.fillStyle = '#8a8377';
    ctx.fillText(new Date().toLocaleDateString(), 40, 100);

    items.forEach((item, index) => {
      const y = 140 + index * rowHeight;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(40, y - 8, width - 80, rowHeight - 8);
      ctx.fillStyle = item.authorColor;
      ctx.fillRect(40, y - 8, 5, rowHeight - 8);
      ctx.fillStyle = '#2b2822';
      ctx.font = '600 17px Inter, sans-serif';
      ctx.fillText(`${index + 1}. ${item.title}`, 64, y + 14);
      if (item.price !== null) {
        ctx.fillStyle = '#c96a2e';
        ctx.font = '700 16px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${item.price} ${item.currency}`, width - 56, y + 14);
        ctx.textAlign = 'left';
      }
    });

    const link = document.createElement('a');
    link.download = `${content.wishlist.name}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function openContextMenu(event: React.MouseEvent, item: WishItem): void {
    setContextMenu({ x: event.clientX, y: event.clientY, item });
  }

  if (isLoading || isError || !content) {
    return (
      <div className="container">
        {isError ? (
          <>
            <div className="error-banner">{t('wishlist.loadError')}</div>
            <button className="btn" onClick={() => void refetch()}>
              {t('common.retry')}
            </button>
          </>
        ) : (
          <div className="spinner" />
        )}
      </div>
    );
  }

  const shareUrl =
    content.wishlist.isShared && content.wishlist.shareSlug
      ? `${window.location.origin}/s/${content.wishlist.shareSlug}`
      : null;

  return (
    <div className="container" onClick={() => setContextMenu(null)}>
      <div className="wishlist-toolbar">
        <div className="left">
          <h1 className="wishlist-title">{content.wishlist.name}</h1>
          <ViewToggle />
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {isOwner && (
            <>
              <button className="btn" onClick={() => setDeadlineOpen(true)}>
                📅 {t('deadline.setBtn')}
              </button>
              <button className="btn" onClick={handleShareToggle}>
                {content.wishlist.isShared ? `🔓 ${t('wishlist.shareClose')}` : `🔗 ${t('wishlist.shareOpen')}`}
              </button>
            </>
          )}
          <button className="btn" onClick={() => setImportOpen(true)}>
            {t('importExport.importBtn')}
          </button>
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
      </div>

      {content.wishlist.description && (
        <p className="muted" style={{ marginBottom: 16 }}>
          {content.wishlist.description}
        </p>
      )}

      {daysLeft !== null && (
        <div style={{ marginBottom: 16 }}>
          <span className="deadline-badge">
            ⏳ {t('deadline.countdown')}: {daysLeft} {daysLeft === 1 ? t('filters.day') : `${daysLeft} ${t('filters.days')}`}
          </span>
        </div>
      )}

      {shareUrl && (
        <div className="share-row">
          <span>{t('wishlist.shareHint')}</span>
          <code>{shareUrl}</code>
        </div>
      )}

      <MembersBar
        members={content.members}
        isOwner={isOwner}
        ownerId={content.wishlist.ownerId}
        wishlistId={content.wishlist.id}
        inviteCode={content.inviteCode}
        onRemoveMember={(targetUserId) =>
          void removeMember({ wishlistId: content.wishlist.id, userId: targetUserId })
        }
      />

      <CategoryBar
        categories={categories}
        selected={categoryFilter}
        onSelect={setCategoryFilter}
        canManage={isOwner}
        totals={categoryTotals}
        onAdd={(name, color) => void addCategory({ name, color })}
        onDelete={(categoryId) => void deleteCategory(categoryId)}
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

      <div className="filter-bar">
        <select
          className="select"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          aria-label={t('filters.status')}
        >
          <option value="all">{t('filters.allStatuses')}</option>
          <option value="wanted">{t('statuses.wanted')}</option>
          <option value="reserved">{t('statuses.reserved')}</option>
          <option value="purchased">{t('statuses.purchased')}</option>
        </select>
        <select
          className="select"
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value as SortMode)}
          aria-label={t('filters.sort')}
        >
          <option value="default">{t('filters.sortDefault')}</option>
          <option value="price-asc">{t('filters.sortPriceAsc')}</option>
          <option value="price-desc">{t('filters.sortPriceDesc')}</option>
          <option value="priority">{t('filters.sortPriority')}</option>
        </select>
      </div>

      {displayItems.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">✨</div>
          <h3>
            {categoryFilter.length > 0 || searchQuery || statusFilter !== 'all'
              ? t('wishlist.emptyFiltered')
              : t('wishlist.emptyTitle')}
          </h3>
          <p>{t('wishlist.emptyText')}</p>
        </div>
      )}

      {groupByPriority(displayItems).map((group) => (
        <section key={group.priority} className="priority-group">
          <div className="priority-group-title" data-priority={group.priority}>
            <span className="badge-dot" style={{ background: `var(--priority-${group.priority})` }} />
            {t(`wishlist.priority${group.priority.charAt(0).toUpperCase()}${group.priority.slice(1)}`)}
          </div>

          {viewMode === 'text' && displayItems.length > 150 ? (
            <WishRowsVirtual
              rows={displayItems}
              categories={categories}
              canDelete={(item) => user !== null && (item.authorId === user.id || isOwner)}
              draggingId={draggedIdRef.current}
              onEdit={(item) => {
                setEditing(item);
                setFormOpen(true);
              }}
              onDelete={(item) => void deleteItem({ itemId: item.id, wishlistId: item.wishlistId })}
              onOffers={(item) => setOffersItem(item)}
              onContextMenu={openContextMenu}
              onDragStart={handleDragStart}
              onDragEnter={handleDragEnter}
              onDragEnd={handleDragEnd}
            />
          ) : viewMode === 'cards' ? (
            <div className="items-grid">
              {group.items.map((item) => (
                <WishItemCard
                  key={item.id}
                  item={item}
                  category={categoryById(item.categoryId)}
                  canDelete={user !== null && (item.authorId === user.id || isOwner)}
                  canToggleStatus={canToggleItemStatus(item)}
                  dragging={draggedIdRef.current === item.id}
                  onEdit={() => {
                    setEditing(item);
                    setFormOpen(true);
                  }}
                  onDelete={() => void deleteItem({ itemId: item.id, wishlistId: item.wishlistId })}
                  onOffers={() => setOffersItem(item)}
                  onComments={() => setCommentsItem(item)}
                  onToggleStatus={() => handleToggleReserve(item)}
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
                  canDelete={user !== null && (item.authorId === user.id || isOwner)}
                  dragging={draggedIdRef.current === item.id}
                  onEdit={() => {
                    setEditing(item);
                    setFormOpen(true);
                  }}
                  onDelete={() => void deleteItem({ itemId: item.id, wishlistId: item.wishlistId })}
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
      {commentsItem && <CommentsModal item={commentsItem} onClose={() => setCommentsItem(null)} />}

      {deadlineOpen && (
        <Modal title={t('deadline.modalTitle')} onClose={() => setDeadlineOpen(false)}>
          <p className="muted" style={{ marginBottom: 14, fontSize: 13.5 }}>
            {t('deadline.hint')}
          </p>
          <input
            type="date"
            className="input"
            value={deadlineValue}
            onChange={(event) => setDeadlineValue(event.target.value)}
          />
          <div className="modal-actions">
            {content.wishlist.deadline && (
              <button
                className="btn btn-ghost"
                onClick={() => {
                  void updateWishlist({ id: content.wishlist.id, patch: { deadline: null } });
                  setDeadlineOpen(false);
                }}
              >
                {t('deadline.clear')}
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={handleDeadlineSave}
              disabled={!deadlineValue}
            >
              {t('deadline.save')}
            </button>
          </div>
        </Modal>
      )}

      {importOpen && (
        <ImportExportModal
          wishlistName={content.wishlist.name}
          onImport={handleImport}
          onExportText={exportAsText}
          onExportPng={exportAsPng}
          onClose={() => setImportOpen(false)}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: t('common.edit'),
              icon: '✏️',
              onSelect: () => {
                setEditing(contextMenu.item);
                setFormOpen(true);
              },
            },
            {
              label: t('common.duplicate'),
              icon: '📄',
              onSelect: () => duplicateItem(contextMenu.item),
            },
            {
              label: t('common.delete'),
              icon: '🗑️',
              danger: true,
              onSelect: () =>
                void deleteItem({ itemId: contextMenu.item.id, wishlistId: contextMenu.item.wishlistId }),
            },
          ]}
        />
      )}
    </div>
  );
}
