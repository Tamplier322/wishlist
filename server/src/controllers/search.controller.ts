import type { Request, Response } from 'express';
import { getSearchSuggestions } from '../services/search.service';
import { asyncHandler } from '../utils/controller-helpers';


export const suggestHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = String(req.query.q ?? '');
  res.json(await getSearchSuggestions(req.user!.id, query));
});
