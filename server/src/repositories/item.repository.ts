import { env } from '../config/env';
import * as sql from './sql/item.repository';
import * as firestore from './firestore/item.repository';

const impl = env.dbDriver === 'firestore' ? firestore : sql;

export type { ItemPatch } from './sql/item.repository';
export type { StoredItem } from './item-record';

export const createItem = impl.createItem;
export const findItemsByWishlist = impl.findItemsByWishlist;
export const findItemById = impl.findItemById;
export const findItemRecordById = impl.findItemRecordById;
export const findItemRecordsByWishlist = impl.findItemRecordsByWishlist;
export const updateItem = impl.updateItem;
export const deleteItem = impl.deleteItem;
export const restoreItem = impl.restoreItem;
export const purgeItem = impl.purgeItem;
export const findDeletedItemsByWishlist = impl.findDeletedItemsByWishlist;
export const purgeExpiredItems = impl.purgeExpiredItems;
export const reorderItems = impl.reorderItems;
