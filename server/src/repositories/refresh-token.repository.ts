import { env } from '../config/env';
import * as sql from './sql/refresh-token.repository';
import * as firestore from './firestore/refresh-token.repository';

const impl = env.dbDriver === 'firestore' ? firestore : sql;

export type { RefreshTokenRecord } from './sql/refresh-token.repository';

export const createRefreshToken = impl.createRefreshToken;
export const findRefreshToken = impl.findRefreshToken;
export const revokeRefreshTokenRecord = impl.revokeRefreshTokenRecord;
export const deleteRefreshToken = impl.deleteRefreshToken;
export const deleteUserRefreshTokens = impl.deleteUserRefreshTokens;
export const deleteExpiredRefreshTokens = impl.deleteExpiredRefreshTokens;
