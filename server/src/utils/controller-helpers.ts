import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';
import { badRequest } from './errors';


export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}


export function parseBody<TSchema extends ZodTypeAny>(
  schema: TSchema,
  body: unknown,
): z.infer<TSchema> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw badRequest('Проверьте правильность заполнения полей', result.error.flatten());
  }
  return result.data;
}
