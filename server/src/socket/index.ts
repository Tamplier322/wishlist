import { Server as HttpServer } from 'node:http';
import { Server as SocketServer, type Socket } from 'socket.io';
import { env } from '../config/env';
import { verifyToken } from '../utils/jwt';
import { findMember, findMembersByWishlist } from '../repositories/member.repository';
import { findWishlistById } from '../repositories/wishlist.repository';
import { findPublicUserById } from '../repositories/user.repository';
import { sendPushToUsers } from '../services/push.service';
import {
  changesSince,
  emitWishlistChange,
  wishlistEvents,
  type WishlistChange,
} from './events';

interface PresenceUser {
  userId: string;
  username: string;
  color: string | null;
}

interface AuthSocket extends Socket {
  data: {
    userId?: string;
    username?: string;
    color?: string | null;
    wishlistIds?: Set<string>;
  };
}

interface SubscribePayload {
  wishlistId?: string;
  token?: string;
  lastEventId?: number;
}

let io: SocketServer | null = null;

function roomName(wishlistId: string): string {
  return `wishlist:${wishlistId}`;
}

function roomPresence(wishlistId: string): PresenceUser[] {
  if (!io) return [];
  const room = io.sockets.adapter.rooms.get(roomName(wishlistId));
  if (!room) return [];

  const users = new Map<string, PresenceUser>();
  for (const socketId of room) {
    const socket = io.sockets.sockets.get(socketId) as AuthSocket | undefined;
    const data = socket?.data;
    if (!data?.userId || !data.username) continue;
    if (users.has(data.userId)) continue;
    users.set(data.userId, {
      userId: data.userId,
      username: data.username,
      color: data.color ?? null,
    });
  }
  return Array.from(users.values());
}

function broadcastPresence(wishlistId: string): void {
  io?.to(roomName(wishlistId)).emit('wishlist:presence', {
    wishlistId,
    users: roomPresence(wishlistId),
  });
}

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.corsOrigins.length > 0 ? env.corsOrigins : false,
      credentials: true,
    },
    maxHttpBufferSize: 512 * 1024,
    pingTimeout: 20_000,
  });

  io.on('connection', (socket: AuthSocket) => {
    socket.data.wishlistIds = new Set<string>();

    socket.on('wishlist:subscribe', async (payload: SubscribePayload) => {
      const { wishlistId, token, lastEventId } = payload ?? {};
      if (!wishlistId || !token) return;

      let userId: string;
      let username: string;
      try {
        const jwt = verifyToken(token);
        userId = jwt.sub;
        username = jwt.username;
      } catch {
        return;
      }

      const wishlist = await findWishlistById(wishlistId);
      if (!wishlist) return;
      const isOwner = wishlist.ownerId === userId;
      if (!isOwner) {
        const member = await findMember(wishlistId, userId);
        if (!member) return;
      }

      const publicUser = await findPublicUserById(userId);
      socket.data.userId = userId;
      socket.data.username = username;
      socket.data.color = publicUser?.avatarColor ?? null;
      socket.data.wishlistIds?.add(wishlistId);

      socket.join(roomName(wishlistId));

      if (typeof lastEventId === 'number') {
        for (const missed of changesSince(wishlistId, lastEventId)) {
          socket.emit('wishlist:changed', missed);
        }
      }

      broadcastPresence(wishlistId);
    });

    socket.on('wishlist:unsubscribe', (wishlistId: string) => {
      if (typeof wishlistId !== 'string') return;
      socket.leave(roomName(wishlistId));
      socket.data.wishlistIds?.delete(wishlistId);
      broadcastPresence(wishlistId);
    });

    socket.on('comment:typing', (payload: { wishlistId?: string; itemId?: string }) => {
      const { wishlistId, itemId } = payload ?? {};
      if (!wishlistId || !itemId) return;
      if (!socket.data.userId || !socket.data.wishlistIds?.has(wishlistId)) return;
      socket.to(roomName(wishlistId)).emit('comment:typing', {
        wishlistId,
        itemId,
        userId: socket.data.userId,
        username: socket.data.username ?? '',
      });
    });

    socket.on('disconnect', () => {
      for (const wishlistId of socket.data.wishlistIds ?? []) {
        broadcastPresence(wishlistId);
      }
    });
  });

  wishlistEvents.on('change', async (change: WishlistChange) => {
    io?.to(roomName(change.wishlistId)).emit('wishlist:changed', change);

    if (
      change.reason === 'item-added' ||
      change.reason === 'item-removed' ||
      change.reason === 'comment-added' ||
      (change.reason === 'item-updated' && change.status)
    ) {
      const wishlist = await findWishlistById(change.wishlistId);
      if (!wishlist) return;
      const members = await findMembersByWishlist(wishlist.id);
      const userIds = members.map((member) => member.userId);
      const title = change.detail ?? '';
      const body =
        change.reason === 'comment-added'
          ? `Новый комментарий: ${title}`
          : change.status === 'reserved'
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
