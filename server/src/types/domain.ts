

export type Priority = 'low' | 'medium' | 'high';
export type ItemStatus = 'wanted' | 'reserved' | 'purchased';
export type MemberRole = 'owner' | 'editor' | 'viewer' | 'member';
export type InviteStatus = 'pending' | 'accepted' | 'declined';


export type WishKind = 'game' | 'skin' | 'book' | 'app' | 'tech' | 'other';

export const WISH_KINDS: readonly WishKind[] = ['game', 'skin', 'book', 'app', 'tech', 'other'];

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarColor: string;

  avatarImage: string | null;
  hasPassword: boolean;
  createdAt: string;
}

export type OAuthProvider = 'google' | 'telegram';

export type AuthEventType =
  | 'login'
  | 'login_failed'
  | 'oauth_login'
  | 'password_set'
  | 'token_reuse';

export interface AuthEvent {
  id: string;
  userId: string | null;
  event: AuthEventType;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface OAuthAccount {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerUserId: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
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

  surpriseMode: boolean;

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
  reservedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrashItem extends WishItem {
  deletedAt: string;
}

export type WishlistEventAction =
  | 'item-added'
  | 'item-updated'
  | 'item-removed'
  | 'item-restored'
  | 'item-purged'
  | 'wishlist-updated'
  | 'member-removed'
  | 'category-changed';

export interface WishlistEvent {
  id: string;
  wishlistId: string;
  actorId: string;
  actorName: string;
  action: WishlistEventAction;
  targetId: string | null;
  title: string | null;
  detail: string | null;
  createdAt: string;
}


export interface Offer {
  id: string;

  provider: string;
  title: string;
  price: number | null;
  currency: string;

  shipping?: number | null;
  totalPrice?: number | null;

  rating: number | null;
  ratingSource: string | null;

  extra: string | null;
  imageUrl: string | null;
  url: string;

  exact?: boolean;

  matchScore?: number;
  relevanceScore?: number;
  searchTerms?: string[];
}


export interface BestPrice {
  price: number;
  currency: string;
  provider: string;
  exact: boolean;
  shipping?: number | null;
  totalPrice?: number | null;
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
