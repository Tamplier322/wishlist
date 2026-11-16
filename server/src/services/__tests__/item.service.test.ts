/// <reference types="vitest/globals" />
import { addItem, editItem, listItems } from '../item.service';
import type { StoredItem } from '../../repositories/item-record';
import type { WishItem, Wishlist } from '../../types/domain';

const itemRepo = vi.hoisted(() => ({
  createItem: vi.fn(),
  deleteItem: vi.fn(),
  findDeletedItemsByWishlist: vi.fn(),
  findItemById: vi.fn(),
  findItemRecordById: vi.fn(),
  findItemRecordsByWishlist: vi.fn(),
  findItemsByWishlist: vi.fn(),
  purgeExpiredItems: vi.fn(),
  purgeItem: vi.fn(),
  reorderItems: vi.fn(),
  restoreItem: vi.fn(),
  updateItem: vi.fn(),
}));

const eventService = vi.hoisted(() => ({
  logEvent: vi.fn(),
}));

const categoryRepo = vi.hoisted(() => ({
  findCategoryById: vi.fn(),
}));

const wishlistService = vi.hoisted(() => ({
  getAccessibleWishlist: vi.fn(),
  assertCanEdit: vi.fn(),
}));

const reservationService = vi.hoisted(() => ({
  releaseExpiredReservations: vi.fn((items: WishItem[]) => items),
  reservationExpiryIso: vi.fn(() => '2026-12-01T00:00:00.000Z'),
}));

const socketEvents = vi.hoisted(() => ({
  emitWishlistChange: vi.fn(),
}));

vi.mock('../../repositories/item.repository', () => itemRepo);
vi.mock('../../repositories/category.repository', () => categoryRepo);
vi.mock('../wishlist.service', () => wishlistService);
vi.mock('../reservation.service', () => reservationService);
vi.mock('../event.service', () => eventService);
vi.mock('../../socket/events', () => socketEvents);

const wishlist = {
  id: 'w1',
  ownerId: 'owner',
  name: 'Список',
  description: '',
  isShared: false,
  shareSlug: null,
  inviteCode: null,
  deadline: null,
  surpriseMode: false,
  workspaceId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
} as Wishlist;

function storedItem(overrides: Partial<StoredItem> = {}): StoredItem {
  return {
    id: 'i1',
    wishlistId: 'w1',
    authorId: 'u1',
    categoryId: null,
    title: 'Наушники',
    description: '',
    link: '',
    imageUrl: '',
    price: null,
    currency: 'USD',
    priority: 'medium',
    kind: 'other',
    status: 'wanted',
    position: 0,
    reservedBy: null,
    reservedUntil: null,
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as StoredItem;
}

function wishItem(overrides: Partial<WishItem> = {}): WishItem {
  return {
    ...storedItem(),
    authorName: 'Тест',
    authorColor: '#60a5fa',
    reservedByName: null,
    reservedByColor: null,
    ...overrides,
  } as WishItem;
}

beforeEach(() => {
  vi.clearAllMocks();
  wishlistService.getAccessibleWishlist.mockResolvedValue(wishlist);
  wishlistService.assertCanEdit.mockResolvedValue(undefined);
  categoryRepo.findCategoryById.mockResolvedValue(null);
  itemRepo.createItem.mockResolvedValue(wishItem());
  itemRepo.updateItem.mockResolvedValue(wishItem());
});

describe('listItems', () => {
  it('проверяет доступ и снимает просроченные брони', async () => {
    itemRepo.findItemsByWishlist.mockResolvedValue([wishItem()]);

    const result = await listItems('w1', 'u1');

    expect(wishlistService.getAccessibleWishlist).toHaveBeenCalledWith('w1', 'u1');
    expect(itemRepo.findItemsByWishlist).toHaveBeenCalledWith('w1');
    expect(reservationService.releaseExpiredReservations).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });
});

describe('addItem', () => {
  it('обрезает название, подставляет значения по умолчанию и шлёт событие', async () => {
    const created = await addItem('w1', 'u1', { title: '  Наушники  ' });

    expect(itemRepo.createItem).toHaveBeenCalledWith(
      expect.objectContaining({
        wishlistId: 'w1',
        authorId: 'u1',
        title: 'Наушники',
        status: 'wanted',
        priority: 'medium',
        kind: 'other',
        currency: 'USD',
      }),
    );
    expect(socketEvents.emitWishlistChange).toHaveBeenCalledWith(
      expect.objectContaining({ wishlistId: 'w1', reason: 'item-added' }),
    );
    expect(created.id).toBe('i1');
  });

  it('не создаёт желание, если нет прав на редактирование', async () => {
    wishlistService.assertCanEdit.mockRejectedValueOnce(new Error('forbidden'));

    await expect(addItem('w1', 'viewer', { title: 'X' })).rejects.toThrow('forbidden');
    expect(itemRepo.createItem).not.toHaveBeenCalled();
  });

  it('проверяет принадлежность категории владельцу списка', async () => {
    categoryRepo.findCategoryById.mockResolvedValueOnce({ id: 'c1', ownerId: 'other' });

    await expect(addItem('w1', 'u1', { title: 'X', categoryId: 'c1' })).rejects.toMatchObject({
      status: 400,
    });
    expect(itemRepo.createItem).not.toHaveBeenCalled();
  });
});

describe('editItem', () => {
  it('при бронировании ставит TTL и автора брони', async () => {
    itemRepo.findItemRecordById.mockResolvedValue(storedItem());

    await editItem('i1', 'u1', { status: 'reserved' });

    expect(itemRepo.updateItem).toHaveBeenCalledWith(
      'i1',
      expect.objectContaining({
        status: 'reserved',
        reservedBy: 'u1',
        reservedUntil: '2026-12-01T00:00:00.000Z',
      }),
      expect.objectContaining({ id: 'i1' }),
    );
  });

  it('запрещает снимать чужую бронь', async () => {
    itemRepo.findItemRecordById.mockResolvedValue(
      storedItem({ status: 'reserved', reservedBy: 'someone-else' }),
    );

    await expect(editItem('i1', 'u1', { status: 'wanted' })).rejects.toMatchObject({
      status: 403,
    });
    expect(itemRepo.updateItem).not.toHaveBeenCalled();
  });

  it('владелец списка может снять чужую бронь', async () => {
    itemRepo.findItemRecordById.mockResolvedValue(
      storedItem({ status: 'reserved', reservedBy: 'someone-else' }),
    );

    await editItem('i1', 'owner', { status: 'wanted' });

    expect(itemRepo.updateItem).toHaveBeenCalledWith(
      'i1',
      expect.objectContaining({ reservedBy: null, reservedUntil: null }),
      expect.anything(),
    );
  });
});
