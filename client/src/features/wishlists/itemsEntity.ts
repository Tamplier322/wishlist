import { createEntityAdapter } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import type { WishItem } from '../../types';


const wishlistItemsAdapter = createEntityAdapter<WishItem>();

export const wishlistItemsSelectors = wishlistItemsAdapter.getSelectors();


export function useWishlistItemsEntity(items: WishItem[]) {
  return useMemo(() => wishlistItemsAdapter.setAll(wishlistItemsAdapter.getInitialState(), items), [items]);
}
