import { env } from '../config/env';
import * as sql from './sql/member.repository';
import * as firestore from './firestore/member.repository';

const impl = env.dbDriver === 'firestore' ? firestore : sql;

export const addMember = impl.addMember;
export const findMember = impl.findMember;
export const findMembersByWishlist = impl.findMembersByWishlist;
export const countMembers = impl.countMembers;
export const findTakenColors = impl.findTakenColors;
export const deleteMember = impl.deleteMember;
