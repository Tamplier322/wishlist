import type { Request, Response } from 'express';
import { addComment, listComments } from '../services/comment.service';
import { asyncHandler, parseBody } from '../utils/controller-helpers';
import { sendJsonWithEtag } from '../utils/etag';
import { readPageQuery, setPageHeaders, sliceByCursor } from '../utils/pagination';
import { commentSchema } from '../utils/validators';

export const listCommentsHandler = asyncHandler(async (req: Request, res: Response) => {
  const page = readPageQuery(req);
  const rows = await listComments(req.params.id, req.user!.id);
  const result = sliceByCursor(rows, page);
  setPageHeaders(res, result, page);
  sendJsonWithEtag(req, res, result.items);
});

export const addCommentHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(commentSchema, req.body);
  const comment = await addComment(req.params.id, req.user!.id, body.text, body.hideFromAuthor === true);
  res.status(201).json(comment);
});
