import { getAccessibleWishlist } from './wishlist.service';

function icsDate(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export async function buildWishlistIcs(wishlistId: string, userId: string): Promise<string | null> {
  const wishlist = await getAccessibleWishlist(wishlistId, userId);
  if (!wishlist.deadline) return null;

  const start = new Date(wishlist.deadline);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wishlist//RU',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${wishlist.id}@wishlist`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escapeIcs(`Дедлайн: ${wishlist.name}`)}`,
    `DESCRIPTION:${escapeIcs(wishlist.description || 'Список желаний Wishlist')}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
