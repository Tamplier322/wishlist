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
import Icon from '../../components/Icon';
import EmptyIllustration from '../../components/EmptyIllustration';
import { WishlistSkeleton } from '../../components/Skeleton';
import { useDialog } from '../../components/DialogProvider';
import { useT } from '../../i18n';
import { DAY_FORM_KEYS, PRIORITY_KEYS } from '../../i18n/labels';
import { getApiErrorMessage } from '../../utils/api-error';
import { useWishlistSocket } from './useWishlistSocket';
import { tokenStorage } from '../../api/client';
import ProgressiveGrid from '../../components/ProgressiveGrid';
import { PullToRefreshIndicator, usePullToRefresh } from '../../components/PullToRefresh';
import { onInstallAvailability } from '../../components/InstallPwaButton';
import { shareLink } from '../../utils/share';
import { isNetworkFailure } from '../../utils/offline-queue';
import CategoryBar from './components/CategoryBar';
import CommentsModal from './components/CommentsModal';
import ImportExportModal from './components/ImportExportModal';
import TrashModal from './components/TrashModal';
import HistoryModal from './components/HistoryModal';
import ItemFormModal from './components/ItemFormModal';
import MembersBar from './components/MembersBar';
import WishItemCard from './components/WishItemCard';
import WishItemRow from './components/WishItemRow';
import WishDetailsModal from './components/WishDetailsModal';
import OffersModal from '../offers/OffersModal';
import { WishRowsVirtual } from './components/WishRowsVirtual';
import { useWishlistItemsEntity, wishlistItemsSelectors } from './itemsEntity';
import { selectViewMode } from '../ui/uiSlice';
import { computeCategoryTotals, useMarketPrices } from './useMarketPrices';
import { toFormValue } from '../../utils/item-form';
import { getBaseCurrency, useCurrency } from '../../utils/currency';
import { groupAndSortByPriority, type SortMode } from '../../utils/priority';
import { PRIORITY_ICONS } from '../../utils/item-icons';
import type { ItemFormValue, WishItem } from '../../types';

type StatusFilter = 'all' | 'wanted' | 'reserved' | 'purchased';

interface ContextMenuState {
  x: number;
  y: number;
  item: WishItem;
}


export default function WishlistPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStatus();
  const { t, plural } = useT();
  const { confirm, alert: showAlert } = useDialog();
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

  const [addItem, { isLoading: addingItem }] = useAddItemMutation();
  const [updateItem, { isLoading: updatingItem }] = useUpdateItemMutation();
  const [patchItem] = usePatchItemMutation();
  const [deleteItem] = useDeleteItemMutation();
  const [addCategory, { isLoading: addingCategory }] = useAddCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();
  const [updateWishlist, { isLoading: updatingWishlist }] = useUpdateWishlistMutation();
  const [removeMember] = useRemoveMemberMutation();
  const [reorderItems] = useReorderItemsMutation();
  const savingItem = addingItem || updatingItem;

  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WishItem | null>(null);
  const [offersItem, setOffersItem] = useState<WishItem | null>(null);
  const [detailsItem, setDetailsItem] = useState<WishItem | null>(null);
  const [commentsItem, setCommentsItem] = useState<WishItem | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [deadlineValue, setDeadlineValue] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [order, setOrder] = useState<string[] | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [undoDelete, setUndoDelete] = useState<WishItem | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [installHint, setInstallHint] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const draggedIdRef = useRef<string | null>(null);
  const targetIdRef = useRef<string | null>(null);
  const deadlineReminderShownRef = useRef(false);
  const userIdRef = useRef<string | undefined>(user?.id);
  userIdRef.current = user?.id;

  const onlineUsers = useWishlistSocket(id, content?.wishlist.ownerId, userIdRef);

  const { pull, refreshing } = usePullToRefresh(() => refetch());

  useEffect(() => onInstallAvailability(setCanInstall), []);

  useEffect(() => {
    function handleFlushed(event: Event): void {
      const sent = (event as CustomEvent<{ sent?: number }>).detail?.sent ?? 0;
      if (sent > 0) {
        dispatch(pushEvent({ text: t('offline.synced', { count: sent }), kind: 'success' }));
      }
    }
    window.addEventListener('offline-queue-flushed', handleFlushed);
    return () => window.removeEventListener('offline-queue-flushed', handleFlushed);
  }, [dispatch, t]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent): void {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        const input = document.getElementById('wishlist-search') as HTMLInputElement | null;
        if (!input) return;
        event.preventDefault();
        input.focus();
        input.select();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const items = useMemo(() => content?.items ?? [], [content]);
  const categories = useMemo(() => content?.categories ?? [], [content]);

  const summary = useMemo(() => {
    const purchased = items.filter((item) => item.status === 'purchased').length;
    const reserved = items.filter((item) => item.status === 'reserved').length;
    return { total: items.length, purchased, reserved };
  }, [items]);

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

  const baseItems = useMemo(() => {
    if (!order) return searchedItems;
    const byId = new Map(searchedItems.map((item) => [item.id, item]));
    const ordered = order
      .map((itemId) => byId.get(itemId))
      .filter((item): item is WishItem => item !== undefined);
    const rest = searchedItems.filter((item) => !order.includes(item.id));
    return [...ordered, ...rest];
  }, [order, searchedItems]);

  const groupedItems = useMemo(
    () => groupAndSortByPriority(baseItems, sortMode),
    [baseItems, sortMode],
  );

  const detailsCurrent = detailsItem
    ? (items.find((item) => item.id === detailsItem.id) ?? detailsItem)
    : null;

  const itemsEntity = useWishlistItemsEntity(searchedItems);
  const getItemById = (itemId: string) => wishlistItemsSelectors.selectById(itemsEntity, itemId);

  const isOwner = content !== undefined && user !== null && content.wishlist.ownerId === user.id;
  const isFiltered =
    categoryFilter.length > 0 || statusFilter !== 'all' || searchQuery.trim().length > 0;

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

  useEffect(() => {
    setOrder(null);
  }, [content?.items]);

  function maybeShowInstallHint(): void {
    if (localStorage.getItem('wl_install_hint_shown') === '1') return;
    localStorage.setItem('wl_install_hint_shown', '1');
    setInstallHint(true);
  }

  async function handleShare(): Promise<void> {
    const url = shareUrl ?? `${window.location.origin}/wishlist/${content?.wishlist.id ?? ''}`;
    const result = await shareLink({
      title: content?.wishlist.name ?? 'Wishlist',
      text: t('shared.shareText'),
      url,
    });
    if (result === 'copied') {
      dispatch(pushEvent({ text: t('shared.shareCopied'), kind: 'success' }));
    } else if (result === 'failed') {
      dispatch(pushEvent({ text: t('shared.shareFailed'), kind: 'error' }));
    }
  }

  async function handleSubmit(value: ItemFormValue): Promise<void> {
    try {
      if (editing) {
        await updateItem({ itemId: editing.id, wishlistId: editing.wishlistId, value }).unwrap();
      } else if (id) {
        await addItem({ wishlistId: id, value }).unwrap();
        maybeShowInstallHint();
      }
      setFormOpen(false);
      setEditing(null);
    } catch (error) {
      if (isNetworkFailure((error as { status?: unknown }).status)) {
        dispatch(pushEvent({ text: t('offline.queued'), kind: 'info' }));
        setFormOpen(false);
        setEditing(null);
        return;
      }
      await showAlert({
        title: t('common.errorTitle'),
        message: getApiErrorMessage(error, t('dialogs.saveError')),
      });
    }
  }

  async function handleSurpriseToggle(): Promise<void> {
    if (!id || !content) return;
    try {
      await updateWishlist({
        id,
        patch: { surpriseMode: !content.wishlist.surpriseMode },
      }).unwrap();
    } catch (error) {
      await showAlert({
        title: t('common.errorTitle'),
        message: getApiErrorMessage(error, t('dialogs.saveError')),
      });
    }
  }

  function toggleSelect(itemId: string): void {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  async function bulkPatch(patch: Partial<ItemFormValue>): Promise<void> {
    const targets = items.filter((item) => selectedIds.has(item.id));
    await Promise.all(
      targets.map((item) =>
        patchItem({ itemId: item.id, wishlistId: item.wishlistId, patch })
          .unwrap()
          .catch(() => null),
      ),
    );
    setSelectedIds(new Set());
  }

  async function bulkDelete(): Promise<void> {
    const ok = await confirm({
      title: t('bulk.deleteTitle'),
      message: t('bulk.deleteConfirm', { count: selectedIds.size }),
      confirmLabel: t('common.delete'),
      danger: true,
    });
    if (!ok) return;
    const wishlistId = content?.wishlist.id;
    if (!wishlistId) return;
    await Promise.all(
      Array.from(selectedIds).map((itemId) =>
        deleteItem({ itemId, wishlistId })
          .unwrap()
          .catch(() => null),
      ),
    );
    setSelectedIds(new Set());
  }

  async function handleShareToggle(): Promise<void> {
    if (!id || !content) return;
    try {
      await updateWishlist({ id, patch: { isShared: !content.wishlist.isShared } }).unwrap();
    } catch (error) {
      await showAlert({
        title: t('common.errorTitle'),
        message: getApiErrorMessage(error, t('dialogs.saveError')),
      });
    }
  }

  async function handleDeadlineSave(): Promise<void> {
    if (!id) return;
    try {
      await updateWishlist({ id, patch: { deadline: deadlineValue || null } }).unwrap();
      setDeadlineOpen(false);
    } catch (error) {
      await showAlert({
        title: t('common.errorTitle'),
        message: getApiErrorMessage(error, t('dialogs.saveError')),
      });
    }
  }

  async function handleDeadlineClear(): Promise<void> {
    if (!id) return;
    try {
      await updateWishlist({ id, patch: { deadline: null } }).unwrap();
      setDeadlineOpen(false);
    } catch (error) {
      await showAlert({
        title: t('common.errorTitle'),
        message: getApiErrorMessage(error, t('dialogs.saveError')),
      });
    }
  }

  async function handleDeleteItem(item: WishItem): Promise<void> {
    const ok = await confirm({
      title: t('dialogs.deleteWishTitle'),
      message: t('dialogs.deleteWishConfirm', { title: item.title }),
      confirmLabel: t('common.delete'),
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteItem({ itemId: item.id, wishlistId: item.wishlistId }).unwrap();
      setDetailsItem((current) => (current?.id === item.id ? null : current));
      setUndoDelete(item);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setUndoDelete(null), 8000);
    } catch (error) {
      await showAlert({
        title: t('common.errorTitle'),
        message: getApiErrorMessage(error, t('dialogs.deleteError')),
      });
    }
  }

  async function handleUndoDelete(): Promise<void> {
    const item = undoDelete;
    if (!item) return;
    try {
      await addItem({ wishlistId: item.wishlistId, value: toFormValue(item) }).unwrap();
      setUndoDelete(null);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    } catch (error) {
      await showAlert({
        title: t('common.errorTitle'),
        message: getApiErrorMessage(error, t('dialogs.saveError')),
      });
    }
  }

  async function handleDeleteCategory(categoryId: string): Promise<void> {
    const category = categories.find((entry) => entry.id === categoryId);
    const ok = await confirm({
      title: t('dialogs.deleteCategoryTitle'),
      message: t('dialogs.deleteCategoryConfirm', { name: category?.name ?? '' }),
      confirmLabel: t('common.delete'),
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteCategory(categoryId).unwrap();
    } catch (error) {
      await showAlert({
        title: t('common.errorTitle'),
        message: getApiErrorMessage(error, t('dialogs.deleteError')),
      });
    }
  }

  async function handleAddCategory(name: string, color: string): Promise<void> {
    try {
      await addCategory({ name, color }).unwrap();
    } catch (error) {
      await showAlert({
        title: t('common.errorTitle'),
        message: getApiErrorMessage(error, t('dialogs.saveError')),
      });
    }
  }

  async function handleRemoveMember(targetUserId: string): Promise<void> {
    if (!content) return;
    const member = content.members.find((entry) => entry.userId === targetUserId);
    const ok = await confirm({
      title: t('dialogs.removeMemberTitle'),
      message: t('dialogs.removeMemberConfirm', { name: member?.user.username ?? '' }),
      confirmLabel: t('common.delete'),
      danger: true,
    });
    if (!ok) return;
    try {
      await removeMember({ wishlistId: content.wishlist.id, userId: targetUserId }).unwrap();
    } catch (error) {
      await showAlert({
        title: t('common.errorTitle'),
        message: getApiErrorMessage(error, t('dialogs.deleteError')),
      });
    }
  }

  async function handleToggleReserve(item: WishItem): Promise<void> {
    const nextStatus =
      item.status === 'wanted' ? 'reserved' : item.status === 'reserved' ? 'wanted' : 'purchased';
    try {
      await updateItem({
        itemId: item.id,
        wishlistId: item.wishlistId,
        value: { ...toFormValue(item), status: nextStatus },
      }).unwrap();
    } catch (error) {
      await showAlert({
        title: t('common.errorTitle'),
        message: getApiErrorMessage(error, t('dialogs.saveError')),
      });
    }
  }

  function handleDragStart(itemId: string): void {
    draggedIdRef.current = itemId;
    if (sortMode !== 'default') {
      setOrder(groupedItems.flatMap((group) => group.items.map((item) => item.id)));
      setSortMode('default');
    }
  }

  function handleDragEnter(targetId: string): void {
    targetIdRef.current = targetId;
    const draggedId = draggedIdRef.current;
    if (!draggedId || draggedId === targetId) return;

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

  async function moveItemByKeyboard(itemId: string, direction: -1 | 1): Promise<void> {
    const base = order ?? searchedItems.map((item) => item.id);
    const fromIndex = base.indexOf(itemId);
    const toIndex = fromIndex + direction;
    if (fromIndex === -1 || toIndex < 0 || toIndex >= base.length) return;

    if (sortMode !== 'default') setSortMode('default');

    const next = [...base];
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, itemId);
    setOrder(next);
    if (!id) return;

    try {
      await reorderItems({ wishlistId: id, order: next }).unwrap();
    } catch (error) {
      setOrder(null);
      await showAlert({
        title: t('common.errorTitle'),
        message: getApiErrorMessage(error, t('dialogs.saveError')),
      });
    }
  }

  async function handleDragEnd(): Promise<void> {
    const draggedId = draggedIdRef.current;
    const targetId = targetIdRef.current;
    draggedIdRef.current = null;
    targetIdRef.current = null;

    if (!draggedId) {
      setOrder(null);
      return;
    }

    let nextOrder = order;
    if (!nextOrder && targetId && targetId !== draggedId) {
      const base = searchedItems.map((item) => item.id);
      const fromIndex = base.indexOf(draggedId);
      const toIndex = base.indexOf(targetId);
      if (fromIndex !== -1 && toIndex !== -1) {
        nextOrder = [...base];
        nextOrder.splice(fromIndex, 1);
        nextOrder.splice(toIndex, 0, draggedId);
      }
    }

    const fromPriority = priorityById.get(draggedId);
    const toPriority = targetId ? priorityById.get(targetId) : undefined;

    const tasks: Array<Promise<unknown>> = [];
    if (fromPriority && toPriority && fromPriority !== toPriority) {
      tasks.push(patchItem({ itemId: draggedId, patch: { priority: toPriority } }).unwrap());
    }
    if (nextOrder && id) {
      tasks.push(reorderItems({ wishlistId: id, order: nextOrder }).unwrap());
    }

    if (tasks.length === 0) {
      setOrder(null);
      return;
    }

    try {
      await Promise.all(tasks);
    } catch (error) {
      setOrder(null);
      await showAlert({
        title: t('common.errorTitle'),
        message: getApiErrorMessage(error, t('dialogs.saveError')),
      });
    }
  }

  async function duplicateItem(item: WishItem): Promise<void> {
    const source = getItemById(item.id) ?? item;
    try {
      await addItem({
        wishlistId: item.wishlistId,
        value: {
          ...toFormValue(source),
          title: `${source.title} (${t('common.copySuffix')})`,
          status: 'wanted',
        },
      }).unwrap();
    } catch (error) {
      await showAlert({
        title: t('common.errorTitle'),
        message: getApiErrorMessage(error, t('dialogs.saveError')),
      });
    }
  }

  async function handleImport(lines: string[]): Promise<void> {
    if (!id) return;
    const values = lines.map((line) => {
      const [title, pricePart, currencyPart] = line.split('|').map((part) => part.trim());
      const price =
        pricePart !== undefined && pricePart !== '' && !Number.isNaN(Number(pricePart))
          ? Number(pricePart)
          : null;
      return {
        title,
        description: '',
        link: '',
        imageUrl: '',
        categoryId: null,
        price,
        currency: currencyPart ?? getBaseCurrency(),
        priority: 'medium' as const,
        kind: 'other' as const,
        status: 'wanted' as const,
      };
    });
    try {
      await Promise.all(values.map((value) => addItem({ wishlistId: id, value }).unwrap()));
    } catch (error) {
      await showAlert({
        title: t('common.errorTitle'),
        message: getApiErrorMessage(error, t('dialogs.saveError')),
      });
    }
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

  function runAction(action: () => void): void {
    setActionsOpen(false);
    action();
  }

  if (isLoading || isError || !content) {
    return (
      <div className="container">
        {isError ? (
          <>
            <div className="error-banner">{t('wishlist.loadError')}</div>
            <button className="btn" onClick={() => void refetch()}>
              <Icon name="retry" size={15} />
              {t('common.retry')}
            </button>
          </>
        ) : (
          <WishlistSkeleton />
        )}
      </div>
    );
  }

  const shareUrl =
    content.wishlist.isShared && content.wishlist.shareSlug
      ? `${window.location.origin}/s/${content.wishlist.shareSlug}`
      : null;

  return (
    <div
      className="container"
      onClick={() => {
        setContextMenu(null);
        setActionsOpen(false);
      }}
    >
      <PullToRefreshIndicator pull={pull} refreshing={refreshing} />
      <div className="wishlist-toolbar">
        <div className="left">
          <h1 className="wishlist-title">{content.wishlist.name}</h1>
          <ViewToggle />
          <div className="actions-menu">
            <button
              type="button"
              className="btn actions-menu-trigger"
              aria-haspopup="menu"
              aria-expanded={actionsOpen}
              onClick={(event) => {
                event.stopPropagation();
                setActionsOpen((current) => !current);
              }}
            >
              <Icon name="settings" size={15} />
              {t('wishlist.actions')}
            </button>
            {actionsOpen && (
              <div
                className="actions-menu-list"
                role="menu"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setActionsOpen(false);
                }}
              >
                {isOwner && (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      className="context-menu-item"
                      onClick={() => runAction(() => setDeadlineOpen(true))}
                    >
                      <Icon name="calendar" size={15} />
                      {t('deadline.setBtn')}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="context-menu-item"
                      onClick={() => runAction(() => void handleShareToggle())}
                      disabled={updatingWishlist}
                    >
                      <Icon name={content.wishlist.isShared ? 'unlock' : 'link'} size={15} />
                      {content.wishlist.isShared ? t('wishlist.shareClose') : t('wishlist.shareOpen')}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className={`context-menu-item ${content.wishlist.surpriseMode ? 'is-active' : ''}`}
                      onClick={() => runAction(() => void handleSurpriseToggle())}
                      disabled={updatingWishlist}
                      title={t('wishlist.surpriseHint')}
                      aria-pressed={content.wishlist.surpriseMode}
                    >
                      <Icon name={content.wishlist.surpriseMode ? 'eye-off' : 'eye'} size={15} />
                      {t('wishlist.surprise')}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  role="menuitem"
                  className="context-menu-item"
                  onClick={() => runAction(() => void handleShare())}
                >
                  <Icon name="share" size={15} />
                  {t('shared.shareBtn')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={`context-menu-item ${selectionMode ? 'is-active' : ''}`}
                  onClick={() =>
                    runAction(() => {
                      setSelectionMode((current) => !current);
                      setSelectedIds(new Set());
                    })
                  }
                >
                  <Icon name="check-circle" size={15} />
                  {t('bulk.select')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="context-menu-item"
                  onClick={() => runAction(() => setImportOpen(true))}
                >
                  <Icon name="upload" size={15} />
                  {t('importExport.importBtn')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="context-menu-item"
                  onClick={() => runAction(() => setTrashOpen(true))}
                >
                  <Icon name="trash" size={15} />
                  {t('trash.openBtn')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="context-menu-item"
                  onClick={() => runAction(() => setHistoryOpen(true))}
                >
                  <Icon name="clock" size={15} />
                  {t('history.openBtn')}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="wishlist-toolbar-actions">
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

      {content.wishlist.description && (
        <p className="muted" style={{ marginBottom: 16 }}>
          {content.wishlist.description}
        </p>
      )}

      {isOwner && content.wishlist.surpriseMode && (
        <div className="surprise-note">
          <Icon name="eye-off" size={15} />
          <span>{t('wishlist.surpriseHint')}</span>
        </div>
      )}

      <div className="list-summary">
        <span className="summary-chip">
          <Icon name="gift" size={14} />
          {summary.total} {t('dashboard.totalWishes')}
        </span>
        {summary.purchased > 0 && (
          <span className="summary-chip is-done">
            <Icon name="check-circle" size={14} />
            {summary.purchased} {t('wishlist.purchased')}
          </span>
        )}
        {summary.reserved > 0 && (
          <span className="summary-chip is-reserved">
            <Icon name="lock" size={14} />
            {summary.reserved} {t('wishlist.reserved')}
          </span>
        )}
      </div>

      {daysLeft !== null && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="deadline-badge">
            <Icon name="clock" size={14} />
            {t('deadline.countdown')}: {daysLeft} {t(DAY_FORM_KEYS[plural(daysLeft)])}
          </span>
          <a
            className="btn btn-sm"
            href={`/api/wishlists/${content.wishlist.id}/calendar.ics?token=${encodeURIComponent(tokenStorage.get() ?? '')}`}
          >
            <Icon name="calendar" size={14} />
            {t('deadline.downloadIcs')}
          </a>
        </div>
      )}

      {selectionMode && selectedIds.size > 0 && (
        <div className="bulk-bar" role="toolbar" aria-label={t('bulk.select')}>
          <span className="bulk-count">{t('bulk.selected', { count: selectedIds.size })}</span>
          <button className="btn btn-sm" onClick={() => void bulkPatch({ status: 'purchased' })}>
            <Icon name="check-circle" size={13} />
            {t('bulk.purchased')}
          </button>
          <button className="btn btn-sm" onClick={() => void bulkPatch({ priority: 'high' })}>
            <Icon name="flame" size={13} />
            {t('bulk.high')}
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => void bulkDelete()}>
            <Icon name="trash" size={13} />
            {t('common.delete')}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => setSelectedIds(new Set())}>
            {t('bulk.clear')}
          </button>
        </div>
      )}

      {shareUrl && (
        <div className="share-row">
          <Icon name="link" size={15} />
          <span>{t('wishlist.shareHint')}</span>
          <code>{shareUrl}</code>
          <button className="btn btn-sm" onClick={() => void handleShare()}>
            <Icon name="share" size={13} />
            {t('shared.shareBtn')}
          </button>
        </div>
      )}

      {installHint && canInstall && (
        <div className="pwa-hint" role="status">
          <Icon name="download" size={16} />
          <span>{t('installHint.text')}</span>
          <button className="btn btn-sm btn-accent" onClick={() => window.dispatchEvent(new Event('pwa-install-request'))}>
            {t('pwa.install')}
          </button>
          <button
            className="btn btn-sm btn-ghost"
            aria-label={t('common.close')}
            onClick={() => {
              setInstallHint(false);
              localStorage.setItem('wl_install_hint_dismissed', '1');
            }}
          >
            <Icon name="close" size={13} />
          </button>
        </div>
      )}

      <MembersBar
        members={content.members}
        onlineUserIds={onlineUsers.map((entry) => entry.userId)}
        isOwner={isOwner}
        ownerId={content.wishlist.ownerId}
        wishlistId={content.wishlist.id}
        inviteCode={content.inviteCode}
        onRemoveMember={(targetUserId) => void handleRemoveMember(targetUserId)}
      />

      <CategoryBar
        categories={categories}
        selected={categoryFilter}
        onSelect={(ids) => {
          setCategoryFilter(ids);
          setOrder(null);
        }}
        canManage={isOwner}
        totals={categoryTotals}
        onAdd={(name, color) => void handleAddCategory(name, color)}
        onDelete={(categoryId) => void handleDeleteCategory(categoryId)}
        busy={addingCategory}
      />

      {undoDelete && (
        <div className="undo-bar" role="status" aria-live="polite">
          <span>{t('undo.deleted', { title: undoDelete.title })}</span>
          <button className="btn btn-sm" onClick={() => void handleUndoDelete()}>
            <Icon name="retry" size={13} />
            {t('undo.action')}
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              setUndoDelete(null);
              if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
            }}
          >
            {t('common.close')}
          </button>
        </div>
      )}

      <div className="search-row">
        <div className="search-field">
          <Icon name="search" size={16} className="search-field-icon" />
          <input
            id="wishlist-search"
            className="input"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setOrder(null);
            }}
            placeholder={t('wishlist.searchPlaceholder')}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear"
              aria-label={t('common.close')}
              onClick={() => {
                setSearchQuery('');
                setOrder(null);
              }}
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-select">
          <Icon name="check-circle" size={15} />
          <select
            className="select"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter);
              setOrder(null);
            }}
            aria-label={t('filters.status')}
          >
            <option value="all">{t('filters.allStatuses')}</option>
            <option value="wanted">{t('statuses.wanted')}</option>
            <option value="reserved">{t('statuses.reserved')}</option>
            <option value="purchased">{t('statuses.purchased')}</option>
          </select>
          <Icon name="chevron-down" size={14} className="filter-caret" />
        </div>
        <div className="filter-select">
          <Icon name="chart" size={15} />
          <select
            className="select"
            value={sortMode}
            onChange={(event) => {
              setSortMode(event.target.value as SortMode);
              setOrder(null);
            }}
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
          <EmptyIllustration icon={isFiltered ? 'search' : 'gift'} tone={isFiltered ? 'sage' : 'peach'} />
          <h3>
            {categoryFilter.length > 0 || searchQuery || statusFilter !== 'all'
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

          {viewMode === 'text' && group.items.length > 150 ? (
            <WishRowsVirtual
              rows={group.items}
              categories={categories}
              canDelete={(item) => user !== null && (item.authorId === user.id || isOwner)}
              draggingId={draggedIdRef.current}
              draggable={!isFiltered}
              onOpen={(item) => setDetailsItem(item)}
              onEdit={(item) => {
                setEditing(item);
                setFormOpen(true);
              }}
              onDelete={(item) => void handleDeleteItem(item)}
              onOffers={(item) => setOffersItem(item)}
              onContextMenu={openContextMenu}
              onDragStart={handleDragStart}
              onDragEnter={handleDragEnter}
              onDragEnd={handleDragEnd}
              onKeyboardMove={(itemId, direction) => void moveItemByKeyboard(itemId, direction)}
            />
          ) : viewMode === 'cards' ? (
            <ProgressiveGrid
              items={group.items}
              className="items-grid"
              renderItem={(item) => (
                <WishItemCard
                  key={item.id}
                  item={item}
                  category={categoryById(item.categoryId)}
                  canDelete={user !== null && (item.authorId === user.id || isOwner)}
                  canToggleStatus={canToggleItemStatus(item)}
                  dragging={draggedIdRef.current === item.id}
                  draggable={!isFiltered}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(item.id)}
                  onSelect={() => toggleSelect(item.id)}
                  onOpen={() => setDetailsItem(item)}
                  onEdit={() => {
                    setEditing(item);
                    setFormOpen(true);
                  }}
                  onDelete={() => void handleDeleteItem(item)}
                  onOffers={() => setOffersItem(item)}
                  onComments={() => setCommentsItem(item)}
                  onToggleStatus={() => handleToggleReserve(item)}
                  onContextMenu={(event) => openContextMenu(event, item)}
                  onDragStart={() => handleDragStart(item.id)}
                  onDragEnter={() => handleDragEnter(item.id)}
                  onDragEnd={handleDragEnd}
                  onKeyboardMove={(direction) => void moveItemByKeyboard(item.id, direction)}
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
                  canDelete={user !== null && (item.authorId === user.id || isOwner)}
                  dragging={draggedIdRef.current === item.id}
                  draggable={!isFiltered}
                  onOpen={() => setDetailsItem(item)}
                  onEdit={() => {
                    setEditing(item);
                    setFormOpen(true);
                  }}
                  onDelete={() => void handleDeleteItem(item)}
                  onOffers={() => setOffersItem(item)}
                  onContextMenu={(event) => openContextMenu(event, item)}
                  onDragStart={() => handleDragStart(item.id)}
                  onDragEnter={() => handleDragEnter(item.id)}
                  onDragEnd={handleDragEnd}
                  onKeyboardMove={(direction) => void moveItemByKeyboard(item.id, direction)}
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
          busy={savingItem}
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
          canDelete={user !== null && (detailsCurrent.authorId === user.id || isOwner)}
          canToggleStatus={canToggleItemStatus(detailsCurrent)}
          canEdit
          canComment
          onClose={() => setDetailsItem(null)}
          onEdit={() => {
            setEditing(detailsCurrent);
            setDetailsItem(null);
            setFormOpen(true);
          }}
          onDelete={() => void handleDeleteItem(detailsCurrent)}
          onToggleStatus={() => void handleToggleReserve(detailsCurrent)}
          onComments={() => {
            setCommentsItem(detailsCurrent);
            setDetailsItem(null);
          }}
        />
      )}

      {offersItem && <OffersModal item={offersItem} onClose={() => setOffersItem(null)} />}
      {commentsItem && <CommentsModal item={commentsItem} onClose={() => setCommentsItem(null)} />}

      {deadlineOpen && (
        <Modal
          title={t('deadline.modalTitle')}
          onClose={() => setDeadlineOpen(false)}
          busy={updatingWishlist}
          busyLabel={t('common.saving')}
        >
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
                onClick={() => void handleDeadlineClear()}
                disabled={updatingWishlist}
              >
                {t('deadline.clear')}
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={() => void handleDeadlineSave()}
              disabled={!deadlineValue || updatingWishlist}
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

      {trashOpen && (
        <TrashModal wishlistId={content.wishlist.id} onClose={() => setTrashOpen(false)} />
      )}

      {historyOpen && (
        <HistoryModal wishlistId={content.wishlist.id} onClose={() => setHistoryOpen(false)} />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: t('common.edit'),
              icon: <Icon name="edit" size={15} />,
              onSelect: () => {
                setEditing(contextMenu.item);
                setFormOpen(true);
              },
            },
            {
              label: t('common.duplicate'),
              icon: <Icon name="copy" size={15} />,
              onSelect: () => duplicateItem(contextMenu.item),
            },
            {
              label: t('common.delete'),
              icon: <Icon name="trash" size={15} />,
              danger: true,
              onSelect: () => void handleDeleteItem(contextMenu.item),
            },
          ]}
        />
      )}
    </div>
  );
}
