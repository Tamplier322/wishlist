import { env } from '../config/env';
import * as sql from './sql/event.repository';
import * as firestore from './firestore/event.repository';

const impl = env.dbDriver === 'firestore' ? firestore : sql;

export type { EventInput } from './sql/event.repository';

export const addEvent = impl.addEvent;
export const findEventsByWishlist = impl.findEventsByWishlist;
