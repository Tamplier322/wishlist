import type { ItemFormValue, WishItem } from '../types';
import { getBaseCurrency } from './currency';

export function toFormValue(item: WishItem | null): ItemFormValue {
  return {
    title: item?.title ?? '',
    description: item?.description ?? '',
    link: item?.link ?? '',
    imageUrl: item?.imageUrl ?? '',
    categoryId: item?.categoryId ?? null,
    price: item?.price ?? null,
    currency: item?.currency ?? getBaseCurrency(),
    priority: item?.priority ?? 'medium',
    kind: item?.kind ?? 'other',
    status: item?.status ?? 'wanted',
  };
}
