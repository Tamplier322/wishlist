import type { Request, Response } from 'express';

export interface PageQuery {
  limit: number;
  cursor?: string;
}

export interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
  total: number;
}

const MAX_LIMIT = 200;

export function readPageQuery(req: Request): PageQuery {
  const rawLimit = Number(req.query.limit ?? 0);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 0), MAX_LIMIT) : 0;
  const cursor = typeof req.query.cursor === 'string' && req.query.cursor !== '' ? req.query.cursor : undefined;
  return { limit, cursor };
}

export function sliceByCursor<T extends { id: string }>(rows: readonly T[], page: PageQuery): PageResult<T> {
  if (page.limit === 0) {
    return { items: [...rows], nextCursor: null, total: rows.length };
  }

  const startIndex = page.cursor ? rows.findIndex((row) => row.id === page.cursor) + 1 : 0;
  const safeStart = startIndex > 0 ? startIndex : 0;
  const items = rows.slice(safeStart, safeStart + page.limit);
  const hasMore = safeStart + items.length < rows.length;
  return {
    items,
    nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : null,
    total: rows.length,
  };
}

export function setPageHeaders(res: Response, result: PageResult<unknown>, requested: PageQuery): void {
  if (requested.limit === 0) return;
  res.set('X-Total-Count', String(result.total));
  if (result.nextCursor) res.set('X-Next-Cursor', result.nextCursor);
}
