import { execRun, getRows } from '../../config/database';
import { createId } from '../../utils/ids';
import type { AuthEvent, AuthEventType } from '../../types/domain';

interface AuthEventRow {
  id: string;
  user_id: string | null;
  event: string;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

function toEvent(row: AuthEventRow): AuthEvent {
  return {
    id: row.id,
    userId: row.user_id,
    event: row.event as AuthEventType,
    ip: row.ip,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

export async function createAuthEvent(input: {
  userId: string | null;
  event: AuthEventType;
  ip: string | null;
  userAgent: string | null;
}): Promise<void> {
  await execRun(
    `INSERT INTO auth_events (id, user_id, event, ip, user_agent, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [createId(), input.userId, input.event, input.ip, input.userAgent, new Date().toISOString()],
  );
}

export async function findAuthEventsByUser(
  userId: string,
  limit: number,
): Promise<AuthEvent[]> {
  const rows = await getRows<AuthEventRow>(
    `SELECT id, user_id, event, ip, user_agent, created_at
     FROM auth_events WHERE user_id = ?
     ORDER BY created_at DESC LIMIT ?`,
    [userId, limit],
  );
  return rows.map(toEvent);
}

export async function deleteExpiredAuthEvents(beforeIso: string): Promise<void> {
  await execRun(`DELETE FROM auth_events WHERE created_at <= ?`, [beforeIso]);
}
