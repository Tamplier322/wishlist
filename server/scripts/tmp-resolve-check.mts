import { resolveLink } from '../src/services/resolve.service';

const urls = [
  'https://www.apple.com/iphone-16-pro/',
  'https://example.com/',
  'https://www.ozon.ru/product/1000000000/',
  'https://www.dns-shop.ru/',
];

for (const url of urls) {
  try {
    const result = await resolveLink(url);
    console.log(url, '=>', JSON.stringify(result));
  } catch (error) {
    console.log(url, '=> ERROR', (error as Error).message);
  }
}
