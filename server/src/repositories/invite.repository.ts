import { env } from '../config/env';
import * as sql from './sql/invite.repository';
import * as firestore from './firestore/invite.repository';

const impl = env.dbDriver === 'firestore' ? firestore : sql;

export const createInvite = impl.createInvite;
export const findInviteById = impl.findInviteById;
export const findPendingInvite = impl.findPendingInvite;
export const findIncomingInvites = impl.findIncomingInvites;
export const updateInviteStatus = impl.updateInviteStatus;
