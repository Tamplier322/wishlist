import { io, type Socket } from 'socket.io-client';
import { tokenStorage } from './client';
import type {
  PresencePayload,
  PresenceUser,
  TypingPayload,
  WishlistChange,
} from '../types';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) socket = io({ autoConnect: false });
  return socket;
}

export function subscribeToWishlist(
  wishlistId: string,
  onChange: (change: WishlistChange) => void,
  onPresence?: (users: PresenceUser[]) => void,
): () => void {
  const instance = getSocket();
  let lastEventId: number | null = null;

  const subscribe = (): void => {
    instance.emit('wishlist:subscribe', {
      wishlistId,
      token: tokenStorage.get(),
      lastEventId: lastEventId ?? undefined,
    });
  };

  const handleChange = (change: WishlistChange): void => {
    if (change.wishlistId !== wishlistId) return;
    if (typeof change.id === 'number') {
      if (lastEventId === null || change.id > lastEventId) lastEventId = change.id;
    }
    onChange(change);
  };

  const handlePresence = (payload: PresencePayload): void => {
    if (payload.wishlistId !== wishlistId) return;
    onPresence?.(payload.users);
  };

  if (!instance.connected) instance.connect();
  subscribe();
  instance.on('connect', subscribe);
  instance.on('wishlist:changed', handleChange);
  instance.on('wishlist:presence', handlePresence);

  return () => {
    instance.off('connect', subscribe);
    instance.emit('wishlist:unsubscribe', wishlistId);
    instance.off('wishlist:changed', handleChange);
    instance.off('wishlist:presence', handlePresence);
  };
}

export function subscribeToCommentTyping(
  wishlistId: string,
  onTyping: (payload: TypingPayload) => void,
): () => void {
  const instance = getSocket();
  const handler = (payload: TypingPayload): void => {
    if (payload.wishlistId === wishlistId) onTyping(payload);
  };
  instance.on('comment:typing', handler);
  return () => {
    instance.off('comment:typing', handler);
  };
}

let typingThrottle: ReturnType<typeof setTimeout> | null = null;

export function emitCommentTyping(wishlistId: string, itemId: string): void {
  if (typingThrottle) return;
  const instance = getSocket();
  if (!instance.connected) return;
  instance.emit('comment:typing', { wishlistId, itemId });
  typingThrottle = setTimeout(() => {
    typingThrottle = null;
  }, 2000);
}
