import { env } from '../config/env';
import * as sql from './sql/comment.repository';
import * as firestore from './firestore/comment.repository';

const impl = env.dbDriver === 'firestore' ? firestore : sql;

export const findCommentsByItem = impl.findCommentsByItem;
export const createComment = impl.createComment;
