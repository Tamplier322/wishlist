import { Server as HttpServer } from 'node:http';
import { Server as SocketServer, type Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { findMember, findMembersByWishlist } from '../repositories/member.repository';
import { findWishlistById } from '../repositories/wishlist.repository';
import { sendPushToUsers } from '../services/push.service';
import { emitWishlistChange, wishlistEvents, type WishlistChange } from './events';

interface AuthSocket extends Socket {
  data: { userId?: string; username?: string };
}

let io: SocketServer | null = null;


export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: true, credentials: true },
  });

  io.on('connection', (socket: AuthSocket) => {
    socket.on('wishlist:subscribe', async (payload: { wishlistId?: string; token?: string }) => {
      const { wishlistId, token } = payload ?? {};
      if (!wishlistId || !token) return;

      let userId: string;
      try {
        const jwt = verifyToken(token);
        userId = jwt.sub;
        socket.data.userId = userId;
      } catch {
        return;
      }


      const wishlist = await findWishlistById(wishlistId);
      if (!wishlist) return;
      const isOwner = wishlist.ownerId === userId;
      if (!isOwner && !findMember(wishlistId, userId)) return;

      socket.join(`wishlist:${wishlistId}`);
    });

    socket.on('wishlist:unsubscribe', (wishlistId: string) => {
      if (typeof wishlistId === 'string') socket.leave(`wishlist:${wishlistId}`);
    });
  });


  wishlistEvents.on('change', async (change: WishlistChange) => {
    io?.to(`wishlist:${change.wishlistId}`).emit('wishlist:changed', change);

    if (change.reason === 'item-added' || change.reason === 'item-removed' || (change.reason === 'item-updated' && change.status)) {
      const wishlist = await findWishlistById(change.wishlistId);
      if (!wishlist) return;
      const members = await findMembersByWishlist(wishlist.id);
      const userIds = members.map((member) => member.userId);
      const title = change.detail ?? '';
      const body =
        change.status === 'reserved'
          ? `Забронировано: ${title}`
          : change.status === 'purchased'
            ? `Куплено: ${title}`
            : change.reason === 'item-added'
              ? `Новое желание: ${title}`
              : `Удалено: ${title}`;
      await sendPushToUsers(userIds, { title: 'Wishlist', body }, change.actorId);
    }
  });

  return io;
}


export { emitWishlistChange };

