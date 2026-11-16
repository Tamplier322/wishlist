import { io, type Socket } from 'socket.io-client';
import { tokenStorage } from './client';
import type { WishlistChange } from '../types';



let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) socket = io({ autoConnect: false });
  return socket;
}


export function subscribeToWishlist(
  wishlistId: string,
  onChange: (change: WishlistChange) => void,
): () => void {
  const socketInstance = getSocket();
  if (!socketInstance.connected) socketInstance.connect();

  socketInstance.emit('wishlist:subscribe', { wishlistId, token: tokenStorage.get() });
  socketInstance.on('wishlist:changed', onChange);

  return () => {
    socketInstance.emit('wishlist:unsubscribe', wishlistId);
    socketInstance.off('wishlist:changed', onChange);
  };
}
