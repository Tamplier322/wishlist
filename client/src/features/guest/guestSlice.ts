import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Category, ItemFormValue, PublicUser, WishItem } from '../../types';

export interface GuestState {
  items: WishItem[];
  categories: Category[];
}

export const GUEST_STORAGE_KEY = 'wl_guest_wishlist';

export const GUEST_SCHEMA_VERSION = 2;

const GUEST_USER: PublicUser = { id: 'guest', username: 'Гость', avatarColor: '#60a5fa' };

const DEFAULT_CATEGORIES: ReadonlyArray<{ name: string; color: string }> = [
  { name: 'Электроника', color: '#38bdf8' },
  { name: 'Игры', color: '#a78bfa' },
  { name: 'Скины', color: '#f87171' },
  { name: 'Одежда', color: '#f472b6' },
  { name: 'Книги', color: '#fbbf24' },
  { name: 'Цифровые товары', color: '#34d399' },
  { name: 'Другое', color: '#94a3b8' },
];

function createId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultCategories(): Category[] {
  return DEFAULT_CATEGORIES.map((category, index) => ({
    id: `guest-cat-${index + 1}`,
    ownerId: GUEST_USER.id,
    name: category.name,
    color: category.color,
    position: index,
  }));
}

function migrateGuestState(parsed: unknown): GuestState | null {
  if (typeof parsed !== 'object' || parsed === null) return null;
  const candidate = parsed as Partial<GuestState> & { version?: number };
  if (!Array.isArray(candidate.items) || !Array.isArray(candidate.categories)) return null;

  const items: WishItem[] = candidate.items.map((item) => ({
    ...item,
    reservedUntil: item.reservedUntil ?? null,
  }));
  return { items, categories: candidate.categories };
}

function initialGuestState(): GuestState {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (raw) {
      const migrated = migrateGuestState(JSON.parse(raw) as unknown);
      if (migrated) return migrated;
    }
  } catch {
  }
  return { items: [], categories: defaultCategories() };
}

const guestSlice = createSlice({
  name: 'guest',
  initialState: initialGuestState,
  reducers: {
    addItem(state, action: PayloadAction<ItemFormValue>) {
      const now = new Date().toISOString();
      state.items.unshift({
        id: createId(),
        wishlistId: 'guest-wishlist',
        authorId: GUEST_USER.id,
        authorName: GUEST_USER.username,
        authorColor: GUEST_USER.avatarColor,
        categoryId: action.payload.categoryId,
        title: action.payload.title,
        description: action.payload.description,
        link: action.payload.link,
        imageUrl: action.payload.imageUrl,
        price: action.payload.price,
        currency: action.payload.currency,
        priority: action.payload.priority,
        kind: action.payload.kind,
        status: action.payload.status,
        reservedBy: null,
        reservedByName: null,
        reservedByColor: null,
        reservedUntil: null,
        createdAt: now,
        updatedAt: now,
      });
    },
    updateItem(state, action: PayloadAction<{ id: string; patch: Partial<ItemFormValue> }>) {
      const item = state.items.find((entry) => entry.id === action.payload.id);
      if (!item) return;
      Object.assign(item, action.payload.patch, { updatedAt: new Date().toISOString() });
      if (action.payload.patch.status !== undefined) {
        if (action.payload.patch.status === 'reserved' && item.status === 'reserved') {
          item.reservedBy = GUEST_USER.id;
          item.reservedByName = GUEST_USER.username;
          item.reservedByColor = GUEST_USER.avatarColor;
        }
        if (action.payload.patch.status !== 'reserved') {
          item.reservedBy = null;
          item.reservedByName = null;
          item.reservedByColor = null;
        }
      }
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    addCategory(state, action: PayloadAction<{ name: string; color: string }>) {
      state.categories.push({
        id: createId(),
        ownerId: GUEST_USER.id,
        name: action.payload.name,
        color: action.payload.color,
        position: state.categories.length,
      });
    },
    removeCategory(state, action: PayloadAction<string>) {
      state.categories = state.categories.filter((category) => category.id !== action.payload);
      state.items.forEach((item) => {
        if (item.categoryId === action.payload) item.categoryId = null;
      });
    },
    moveItem(state, action: PayloadAction<{ fromId: string; toId: string }>) {
      const { fromId, toId } = action.payload;
      const fromIndex = state.items.findIndex((item) => item.id === fromId);
      const toIndex = state.items.findIndex((item) => item.id === toId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
      const [moved] = state.items.splice(fromIndex, 1);
      state.items.splice(toIndex, 0, moved);
    },
    replaceGuestState(state, action: PayloadAction<GuestState>) {
      state.items = action.payload.items;
      state.categories = action.payload.categories;
    },
  },
});

export const {
  addItem,
  updateItem,
  removeItem,
  addCategory,
  removeCategory,
  moveItem,
  replaceGuestState,
} = guestSlice.actions;
export default guestSlice.reducer;

export const selectGuestItems = (state: { guest: GuestState }): WishItem[] => state.guest.items;
export const selectGuestCategories = (state: { guest: GuestState }): Category[] =>
  state.guest.categories;
