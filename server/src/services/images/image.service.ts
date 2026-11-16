import { findRelevantOfferImage, findOffers } from '../offers/offers.service';
import type { WishKind } from '../../types/domain';
import { fetchJson } from '../offers/providers/http';



interface WikiResponse {
  query?: {
    pages?: Record<string, { thumbnail?: { source?: string } }>;
  };
}

async function wikiImage(lang: 'ru' | 'en', query: string): Promise<string | null> {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*` +
    `&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=3` +
    `&prop=pageimages&piprop=thumbnail&pithumbsize=600`;

  try {
    const data = await fetchJson<WikiResponse>(url);
    const pages = data.query?.pages;
    if (!pages) return null;
    const withThumb = Object.values(pages).find((page) => page.thumbnail?.source);
    return withThumb?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}


export async function findItemImage(query: string, kind: WishKind): Promise<string | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const wiki = (await wikiImage('ru', trimmed)) ?? (await wikiImage('en', trimmed));
  if (wiki) return wiki;

  const result = await findOffers(trimmed, kind);
  return findRelevantOfferImage(result.offers, trimmed);
}
