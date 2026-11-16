export type ErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'OAUTH_PROVIDER_ERROR'
  | 'OAUTH_STATE_INVALID'
  | 'OAUTH_EMAIL_EXISTS'
  | 'OAUTH_ALREADY_LINKED'
  | 'OAUTH_LAST_METHOD'
  | 'INTERNAL';

const DEFAULT_CODES: Record<number, ErrorCode> = {
  400: 'VALIDATION',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
  502: 'OAUTH_PROVIDER_ERROR',
};

export class HttpError extends Error {
  public readonly status: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown, code?: ErrorCode) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code ?? DEFAULT_CODES[status] ?? 'INTERNAL';
    this.details = details;
  }
}

export const badRequest = (message = 'Некорректный запрос', details?: unknown): HttpError =>
  new HttpError(400, message, details, 'VALIDATION');

export const unauthorized = (message = 'Требуется авторизация'): HttpError =>
  new HttpError(401, message, undefined, 'UNAUTHORIZED');

export const forbidden = (message = 'Доступ запрещён'): HttpError =>
  new HttpError(403, message, undefined, 'FORBIDDEN');

export const notFound = (message = 'Не найдено'): HttpError =>
  new HttpError(404, message, undefined, 'NOT_FOUND');

export const conflict = (message: string): HttpError =>
  new HttpError(409, message, undefined, 'CONFLICT');
