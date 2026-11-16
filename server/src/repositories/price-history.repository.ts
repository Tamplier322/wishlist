import { env } from '../config/env';
import * as sql from './sql/price-history.repository';
import * as firestore from './firestore/price-history.repository';

const impl = env.dbDriver === 'firestore' ? firestore : sql;

export type { PricePointRecord } from './sql/price-history.repository';

export const createPricePoint = impl.createPricePoint;
export const findLatestPricePoint = impl.findLatestPricePoint;
export const listPricePoints = impl.listPricePoints;
