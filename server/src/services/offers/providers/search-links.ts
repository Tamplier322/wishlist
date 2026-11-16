import type { SearchLink, WishKind } from '../../../types/domain';


export function buildSearchLinks(query: string, kind: WishKind): SearchLink[] {
  const q = encodeURIComponent(query);
  const links: SearchLink[] = [
    { name: 'Google Shopping', url: `https://www.google.com/search?tbm=shop&q=${q}` },
    { name: 'Ozon', url: `https://www.ozon.ru/search/?text=${q}` },
    { name: 'Wildberries', url: `https://www.wildberries.ru/search?query=${q}` },
    { name: 'Яндекс Маркет', url: `https://market.yandex.ru/search?text=${q}` },
  ];

  switch (kind) {
    case 'game':
      links.push(
        { name: 'Steam', url: `https://store.steampowered.com/search/?term=${q}` },
        { name: 'Epic Games', url: `https://store.epicgames.com/ru/browse?q=${q}` },
      );
      break;
    case 'skin':
      links.push(
        { name: 'Steam Market', url: `https://steamcommunity.com/market/search?q=${q}` },
        { name: 'CS.MONEY', url: `https://cs.money/ru/market/?search=${q}` },
        { name: 'Marketch (Dota)', url: `https://marketch.cash/ru/market?search=${q}` },
      );
      break;
    case 'book':
      links.push(
        { name: 'ЛитРес', url: `https://www.litres.ru/pages/rubric/?q=${q}` },
        { name: 'Читай-город', url: `https://chitai-gorod.ru/search?q=${q}` },
      );
      break;
    case 'app':
      links.push(
        { name: 'App Store', url: `https://apps.apple.com/ru/search?term=${q}` },
        { name: 'Google Play', url: `https://play.google.com/store/search?q=${q}` },
      );
      break;
    case 'tech':
      links.push(
        { name: 'DNS', url: `https://www.dns-shop.ru/search/?q=${q}` },
        { name: 'Citilink', url: `https://www.citilink.ru/search/?text=${q}` },
      );
      break;
    default:
      break;
  }

  return links;
}
