import { env } from '../config/env';
import * as sql from './sql/user.repository';
import * as firestore from './firestore/user.repository';

const impl = env.dbDriver === 'firestore' ? firestore : sql;

export type { UserWithPassword } from './sql/user.repository';

export const createUser = impl.createUser;
export const findUserByLogin = impl.findUserByLogin;
export const findUserByUsername = impl.findUserByUsername;
export const findUserByEmail = impl.findUserByEmail;
export const findUserById = impl.findUserById;
export const findUserWithPasswordById = impl.findUserWithPasswordById;
export const updatePassword = impl.updatePassword;
export const updateUserProfile = impl.updateUserProfile;
export const deleteUserAccount = impl.deleteUserAccount;
export const findPublicUserById = impl.findPublicUserById;
