

export type Priority = 'low' | 'medium' | 'high';
export type ItemStatus = 'wanted' | 'reserved' | 'purchased';
export type MemberRole = 'owner' | 'member';
export type InviteStatus = 'pending' | 'accepted' | 'declined';


export type WishKind = 'game' | 'skin' | 'book' | 'app' | 'tech' | 'other';

export const WISH_KINDS: readonly WishKind[] = ['game', 'skin', 'book', 'app', 'tech', 'other'];

export interface User {
  id: string;
  username: string;
  email: string;
  avatarColor: string;

  avatarImage: string | null;
  createdAt: string;
}

export interface Category {
  id: string;
  ownerId: string;
  name: string;
  color: string;
  position: number;
}

export interface Wishlist {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  isShared: boolean;
  shareSlug: string | null;

  inviteCode: string | null;

  deadline: string | null;

  workspaceId: string | null;
  createdAt: string;
}


export interface Workspace {
  id: string;
  ownerId: string;
  name: string;
  color: string;
  createdAt: string;
}


export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
}


export interface Comment {
  id: string;
  itemId: string;
  author: PublicUser;
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
  role: MemberRole;
  joinedAt: string;
  user: PublicUser;
}

export interface PublicUser {
  id: string;
  username: string;
  avatarColor: string;
}

export interface Invite {
  id: string;
  wishlistId: string;
  fromUserId: string;
  toUserId: string;
  status: InviteStatus;
  createdAt: string;
  wishlistName: string;
  fromUsername: string;
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
