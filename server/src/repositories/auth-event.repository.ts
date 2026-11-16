import { env } from '../config/env';
import * as sql from './sql/auth-event.repository';
import * as firestore from './firestore/auth-event.repository';

const impl = env.dbDriver === 'firestore' ? firestore : sql;

export const createAuthEvent = impl.createAuthEvent;
export const findAuthEventsByUser = impl.findAuthEventsByUser;
export const deleteExpiredAuthEvents = impl.deleteExpiredAuthEvents;
