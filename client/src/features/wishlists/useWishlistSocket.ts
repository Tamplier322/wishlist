import { useEffect, type RefObject } from 'react';
import { baseApi } from '../../api/baseApi';
import { subscribeToWishlist } from '../../api/socket';
import { useAppDispatch } from '../../app/hooks';
import { pushEvent } from '../notifications/notificationsSlice';
import { useT } from '../../i18n';
import type { WishlistChange } from '../../types';


export function useWishlistSocket(
  wishlistId: string | undefined,
  ownerId: string | undefined,
  userIdRef: RefObject<string | undefined>,
): void {
  const dispatch = useAppDispatch();
  const { t } = useT();

  useEffect(() => {
    if (!wishlistId) return;

    const unsubscribe = subscribeToWishlist(wishlistId, (change: WishlistChange) => {
      dispatch(baseApi.util.invalidateTags([{ type: 'Wishlist', id: change.wishlistId }]));

      const isMine = change.actorId === userIdRef.current;
      if (isMine || ownerId === undefined) return;

      const title = change.detail ?? '';
      if (change.status === 'reserved' && title) {
        dispatch(pushEvent({ text: t('notifications.reserved', { title }), kind: 'info' }));
      } else if (change.status === 'purchased' && title) {
        dispatch(pushEvent({ text: t('notifications.purchased', { title }), kind: 'success' }));
      } else if (change.reason === 'item-added' && title) {
        dispatch(pushEvent({ text: t('notifications.added', { title }), kind: 'info' }));
      } else if (change.reason === 'item-removed' && title) {
        dispatch(pushEvent({ text: t('notifications.removed', { title }), kind: 'info' }));
      }
    });

    return unsubscribe;
  }, [dispatch, ownerId, t, wishlistId]);
}
