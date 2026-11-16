import { env } from '../config/env';
import * as sql from './sql/workspace.repository';
import * as firestore from './firestore/workspace.repository';

const impl = env.dbDriver === 'firestore' ? firestore : sql;

export const createWorkspace = impl.createWorkspace;
export const findWorkspacesByOwner = impl.findWorkspacesByOwner;
export const findWorkspaceById = impl.findWorkspaceById;
export const updateWorkspace = impl.updateWorkspace;
export const deleteWorkspace = impl.deleteWorkspace;
export const assignListToWorkspace = impl.assignListToWorkspace;
