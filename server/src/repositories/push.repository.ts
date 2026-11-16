import { env } from '../config/env';
import * as sql from './sql/push.repository';
import * as firestore from './firestore/push.repository';

const impl = env.dbDriver === 'firestore' ? firestore : sql;

export type { PushSubscriptionInput, PushSubscriptionRow } from './sql/push.repository';

export const upsertSubscription = impl.upsertSubscription;
export const deleteSubscription = impl.deleteSubscription;
export const findSubscriptionsByUsers = impl.findSubscriptionsByUsers;
