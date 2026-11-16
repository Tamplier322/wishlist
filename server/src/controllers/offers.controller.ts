import type { Request, Response } from 'express';
import { findOffers } from '../services/offers/offers.service';
import { findItemImage } from '../services/images/image.service';
import { asyncHandler, parseBody } from '../utils/controller-helpers';
import { bestPriceQuerySchema, offersSearchSchema } from '../utils/validators';


export const searchOffersHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(offersSearchSchema, req.body);
  const result = await findOffers(body.query, body.kind as never);
  res.json(result);
});


export const bestPriceHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = parseBody(bestPriceQuerySchema, req.query);
  const result = await findOffers(query.query, query.kind as never);
  res.json(result.bestPrice);
});


export const bestImageHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = parseBody(bestPriceQuerySchema, req.query);
  const url = await findItemImage(query.query, query.kind as never);
  res.json({ url });
});
