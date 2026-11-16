import { env } from '../config/env';
import * as sql from './sql/wishlist.repository';
import * as firestore from './firestore/wishlist.repository';

const impl = env.dbDriver === 'firestore' ? firestore : sql;

export type { ItemsStats } from './sql/wishlist.repository';

export const createWishlist = impl.createWishlist;
export const findWishlistById = impl.findWishlistById;
export const findWishlistBySlug = impl.findWishlistBySlug;
export const findWishlistByInviteCode = impl.findWishlistByInviteCode;
export const findWishlistsByUser = impl.findWishlistsByUser;
export const updateWishlist = impl.updateWishlist;
export const setShared = impl.setShared;
export const deleteWishlist = impl.deleteWishlist;
export const findItemsStats = impl.findItemsStats;
