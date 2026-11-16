import { baseApi } from '../../api/baseApi';
import type { AppDispatch } from '../../app/store';
import { toFormValue } from '../../utils/item-form';
import { GUEST_STORAGE_KEY, type GuestState } from './guestSlice';

function readGuestState(): GuestState | null {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestState;
    if (!Array.isArray(parsed.items) || !Array.isArray(parsed.categories)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function mergeGuestWishlist(dispatch: AppDispatch): Promise<number> {
  const guest = readGuestState();
  if (!guest || guest.items.length === 0) return 0;

  let wishlists;
  try {
    wishlists = await dispatch(baseApi.endpoints.getWishlists.initiate()).unwrap();
  } catch {
    return 0;
  }
  const target = wishlists[0];
  if (!target) return 0;

  let moved = 0;
  for (const item of guest.items) {
    try {
      await dispatch(
        baseApi.endpoints.addItem.initiate({ wishlistId: target.id, value: toFormValue(item) }),
      ).unwrap();
      moved += 1;
    } catch {
    }
  }

  if (moved > 0) {
    localStorage.removeItem(GUEST_STORAGE_KEY);
    dispatch(baseApi.util.invalidateTags(['Wishlists', { type: 'Wishlist', id: target.id }]));
  }
  return moved;
}
