
export class HttpError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message = 'Некорректный запрос', details?: unknown): HttpError =>
  new HttpError(400, message, details);

export const unauthorized = (message = 'Требуется авторизация'): HttpError =>
  new HttpError(401, message);

export const forbidden = (message = 'Доступ запрещён'): HttpError =>
  new HttpError(403, message);

export const notFound = (message = 'Не найдено'): HttpError => new HttpError(404, message);

export const conflict = (message: string): HttpError => new HttpError(409, message);
