import { env } from '../config/env';
import * as sql from './sql/oauth-account.repository';
import * as firestore from './firestore/oauth-account.repository';

const impl = env.dbDriver === 'firestore' ? firestore : sql;

export type { OAuthAccountInput } from './sql/oauth-account.repository';

export const createOAuthAccount = impl.createOAuthAccount;
export const findOAuthAccount = impl.findOAuthAccount;
export const findOAuthAccountsByUser = impl.findOAuthAccountsByUser;
export const updateOAuthAccountProfile = impl.updateOAuthAccountProfile;
export const deleteOAuthAccount = impl.deleteOAuthAccount;
