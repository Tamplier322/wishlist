import { env } from '../config/env';
import * as sql from './sql/category.repository';
import * as firestore from './firestore/category.repository';

const impl = env.dbDriver === 'firestore' ? firestore : sql;

export const createCategory = impl.createCategory;
export const findCategoriesByOwner = impl.findCategoriesByOwner;
export const findCategoryById = impl.findCategoryById;
export const updateCategory = impl.updateCategory;
export const deleteCategory = impl.deleteCategory;
