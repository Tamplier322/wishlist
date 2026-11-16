

export type Priority = 'low' | 'medium' | 'high';
export type ItemStatus = 'wanted' | 'reserved' | 'purchased';
export type WishKind = 'game' | 'skin' | 'book' | 'app' | 'tech' | 'other';
export type ViewMode = 'cards' | 'text';

export const WISH_KINDS: ReadonlyArray<{ value: WishKind; label: string }> = [
  { value: 'game', label: 'Игра' },
  { value: 'book', label: 'Книга' },
  { value: 'app', label: 'Приложение / медиа' },
  { value: 'tech', label: 'Техника' },
  { value: 'other', label: 'Другое' },
  { value: 'skin', label: 'Игровой предмет' },
];

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

export const STATUS_LABELS: Record<ItemStatus, string> = {
  wanted: 'Хочу',
  reserved: 'Забронировано',
  purchased: 'Куплено',
};

export const KIND_LABELS: Record<WishKind, string> = {
  game: 'Игра',
  skin: 'Скин',
  book: 'Книга',
  app: 'Приложение',
  tech: 'Техника',
  other: 'Другое',
};

export interface User {
  id: string;
  username: string;
  email: string;
  avatarColor: string;

  avatarImage: string | null;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  username: string;
  avatarColor: string;
}

export interface Category {
  id: string;
  ownerId: string;
  name: string;
  color: string;
  position: number;
}

export interface Workspace {
  id: string;
  ownerId: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface Wishlist {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  isShared: boolean;
  shareSlug: string | null;

  deadline: string | null;

  workspaceId: string | null;
  createdAt: string;
}

export interface Comment {
  id: string;
  itemId: string;
  author: { id: string; username: string; avatarColor: string };
  text: string;
  hideFromAuthor: boolean;
  createdAt: string;
}

export interface WishlistStats {
  total: number;
  purchased: number;
}

export interface WishlistWithStats extends Wishlist {
  stats: WishlistStats;
}

export interface WishlistMember {
  id: string;
  wishlistId: string;
  userId: string;
  color: string;
  role: 'owner' | 'member';
  joinedAt: string;
  user: PublicUser;
}

export interface Invite {
  id: string;
  wishlistId: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  wishlistName: string;
  fromUsername: string;
}


export interface InviteInfo {
  wishlistId: string;
  name: string;
  owner: { id: string; username: string; avatarColor: string };
}

export interface WishItem {
  id: string;
  wishlistId: string;
  authorId: string;
  authorName: string;
  authorColor: string;
  categoryId: string | null;
  title: string;
  description: string;
  link: string;
  imageUrl: string;
  price: number | null;
  currency: string;
  priority: Priority;
  kind: WishKind;
  status: ItemStatus;
  reservedBy: string | null;
  reservedByName: string | null;
  reservedByColor: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Offer {
  id: string;
  provider: string;
  title: string;
  price: number | null;
  currency: string;
  rating: number | null;
  ratingSource: string | null;
  extra: string | null;
  imageUrl: string | null;
  url: string;
  exact?: boolean;
}

export interface BestPrice {
  price: number;
  currency: string;
  provider: string;
  exact: boolean;
}

export interface SearchLink {
  name: string;
  url: string;
}

export interface BestImage {
  url: string | null;
}

export interface OffersResult {
  query: string;
  kind: WishKind;
  offers: Offer[];
  searchLinks: SearchLink[];
  providersUsed: string[];
  bestPrice: BestPrice | null;
}

export interface WishlistContent {
  wishlist: Wishlist;
  members: WishlistMember[];
  categories: Category[];
  items: WishItem[];

  inviteCode?: string | null;
}

export interface SharedWishlistView {
  wishlist: Pick<Wishlist, 'id' | 'name' | 'description' | 'shareSlug'>;
  owner: PublicUser;
  members: WishlistMember[];
  categories: Category[];
  items: WishItem[];
}


export interface Credentials {
  login: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface ItemFormValue {
  title: string;
  description: string;
  link: string;
  imageUrl: string;
  categoryId: string | null;
  price: number | null;
  currency: string;
  priority: Priority;
  kind: WishKind;
  status: ItemStatus;
}


export interface WishlistChange {
  wishlistId: string;
  actorId: string;
  reason:
    | 'item-added'
    | 'item-updated'
    | 'item-removed'
    | 'wishlist-updated'
    | 'member-removed'
    | 'category-changed';
  detail?: string;
  status?: ItemStatus;
}
