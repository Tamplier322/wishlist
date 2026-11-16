import type { Request, Response } from 'express';
import { addComment, listComments } from '../services/comment.service';
import { asyncHandler, parseBody } from '../utils/controller-helpers';
import { commentSchema } from '../utils/validators';

export const listCommentsHandler = asyncHandler(async (req: Request, res: Response) => {
  res.json(await listComments(req.params.id, req.user!.id));
});

export const addCommentHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(commentSchema, req.body);
  const comment = await addComment(req.params.id, req.user!.id, body.text, body.hideFromAuthor === true);
  res.status(201).json(comment);
});
