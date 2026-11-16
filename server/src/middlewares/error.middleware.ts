import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/errors';
import { isProduction } from '../config/env';

interface ZodLikeError {
  issues?: unknown[];
}


export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message, details: err.details });
    return;
  }

  const zodIssue = err as ZodLikeError;
  if (zodIssue && Array.isArray(zodIssue.issues)) {
    res.status(400).json({ message: 'Ошибка валидации данных', details: zodIssue.issues });
    return;
  }

  if (!isProduction) {
    console.error('Unhandled error:', err);
  } else {

    console.error('Unhandled error:', err);
  }
  res.status(500).json({ message: 'Внутренняя ошибка сервера', error: isProduction ? undefined : String(err) });
}
