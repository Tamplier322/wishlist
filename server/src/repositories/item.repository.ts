import { env } from '../config/env';
import * as sql from './sql/item.repository';
import * as firestore from './firestore/item.repository';

const impl = env.dbDriver === 'firestore' ? firestore : sql;

export type { ItemPatch } from './sql/item.repository';

export const createItem = impl.createItem;
export const findItemsByWishlist = impl.findItemsByWishlist;
export const findItemById = impl.findItemById;
export const updateItem = impl.updateItem;
export const deleteItem = impl.deleteItem;
export const reorderItems = impl.reorderItems;
