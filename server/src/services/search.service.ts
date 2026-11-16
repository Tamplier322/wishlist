import { findItemsByWishlist } from '../repositories/item.repository';
import { PRESET_CATEGORIES } from './presets.service';
import { findWishlistsByUser } from '../repositories/wishlist.repository';

export interface SearchSuggestion {
  label: string;
  type: 'category' | 'wishlist' | 'item';
  value: string;
}


export async function getSearchSuggestions(userId: string, query: string): Promise<SearchSuggestion[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const suggestions: SearchSuggestion[] = [];

  PRESET_CATEGORIES.forEach((preset) => {
    if (preset.name.toLowerCase().includes(q)) {
      suggestions.push({ label: preset.name, type: 'category', value: preset.name });
    }
  });

  const wishlists = await findWishlistsByUser(userId);
  wishlists.forEach((wishlist) => {
    if (wishlist.name.toLowerCase().includes(q)) {
      suggestions.push({ label: wishlist.name, type: 'wishlist', value: wishlist.name });
    }
  });

  for (const wishlist of wishlists.slice(0, 10)) {
    const items = await findItemsByWishlist(wishlist.id);
    items.forEach((item) => {
      if (item.title.toLowerCase().includes(q)) {
        suggestions.push({ label: item.title, type: 'item', value: item.title });
      }
    });
  }


  const seen = new Set<string>();
  return suggestions
    .filter((suggestion) => {
      const key = `${suggestion.type}:${suggestion.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}
