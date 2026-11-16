import type { Request } from 'express';
import { logger } from '../config/logger';
import {
  createAuthEvent,
  findAuthEventsByUser,
} from '../repositories/auth-event.repository';
import type { AuthEvent, AuthEventType } from '../types/domain';

const USER_AGENT_LIMIT = 300;
const IP_LIMIT = 60;

function clientIp(req: Request): string | null {
  return (req.ip ?? '').slice(0, IP_LIMIT) || null;
}

function clientAgent(req: Request): string | null {
  const value = req.headers['user-agent'];
  if (typeof value !== 'string' || value === '') return null;
  return value.slice(0, USER_AGENT_LIMIT);
}

export function recordAuthEvent(
  req: Request,
  event: AuthEventType,
  userId: string | null,
): void {
  void createAuthEvent({
    userId,
    event,
    ip: clientIp(req),
    userAgent: clientAgent(req),
  }).catch((error) => {
    logger.warn({ err: error, event }, 'Не удалось записать событие безопасности');
  });
}

export function recordAuthEventForUser(userId: string, event: AuthEventType): void {
  void createAuthEvent({ userId, event, ip: null, userAgent: null }).catch((error) => {
    logger.warn({ err: error, event }, 'Не удалось записать событие безопасности');
  });
}

export async function listAuthEvents(userId: string, limit = 20): Promise<AuthEvent[]> {
  return findAuthEventsByUser(userId, Math.min(Math.max(limit, 1), 100));
}
