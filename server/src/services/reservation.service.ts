import { updateItem } from '../repositories/item.repository';
import type { WishItem } from '../types/domain';

export const RESERVATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function reservationExpiryIso(): string {
  return new Date(Date.now() + RESERVATION_TTL_MS).toISOString();
}

export function isReservationExpired(item: WishItem): boolean {
  if (item.status !== 'reserved' || !item.reservedUntil) return false;
  return new Date(item.reservedUntil).getTime() <= Date.now();
}

export async function releaseExpiredReservations(items: WishItem[]): Promise<WishItem[]> {
  const expired = items.filter(isReservationExpired);
  if (expired.length === 0) return items;

  await Promise.all(
    expired.map((item) =>
      updateItem(item.id, { status: 'wanted', reservedBy: null, reservedUntil: null }),
    ),
  );

  const expiredIds = new Set(expired.map((item) => item.id));
  return items.map((item) =>
    expiredIds.has(item.id)
      ? {
          ...item,
          status: 'wanted',
          reservedBy: null,
          reservedByName: null,
          reservedByColor: null,
          reservedUntil: null,
        }
      : item,
  );
}
