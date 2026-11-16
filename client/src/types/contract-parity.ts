import type {
  Category,
  OAuthAccountInfo,
  OAuthAccountsResponse,
  Offer,
  OffersResult,
  PublicUser,
  TrashItem,
  User,
  WishItem,
  Wishlist,
  WishlistContent,
  WishlistEvent,
} from './index';
import type {
  ApiCategory,
  ApiEvent,
  ApiOAuthAccount,
  ApiOAuthAccounts,
  ApiOffer,
  ApiOffersResult,
  ApiPublicUser,
  ApiTrashItem,
  ApiUser,
  ApiWishItem,
  ApiWishlist,
  ApiWishlistContent,
} from './api-contract';

type Satisfies<Server extends Client, Client> = [Server] extends [Client] ? true : false;

const publicUser: Satisfies<ApiPublicUser, PublicUser> = true;
const category: Satisfies<ApiCategory, Category> = true;
const wishItem: Satisfies<ApiWishItem, WishItem> = true;
const trashItem: Satisfies<ApiTrashItem, TrashItem> = true;
const wishlist: Satisfies<ApiWishlist, Wishlist> = true;
const offer: Satisfies<ApiOffer, Offer> = true;
const offersResult: Satisfies<ApiOffersResult, OffersResult> = true;
const wishlistContent: Satisfies<ApiWishlistContent, WishlistContent> = true;
const event: Satisfies<ApiEvent, WishlistEvent> = true;
const user: Satisfies<ApiUser, User> = true;
const oauthAccount: Satisfies<ApiOAuthAccount, OAuthAccountInfo> = true;
const oauthAccounts: Satisfies<ApiOAuthAccounts, OAuthAccountsResponse> = true;

export const contractParityChecks = [
  publicUser,
  category,
  wishItem,
  trashItem,
  wishlist,
  offer,
  offersResult,
  wishlistContent,
  event,
  user,
  oauthAccount,
  oauthAccounts,
] as const;
