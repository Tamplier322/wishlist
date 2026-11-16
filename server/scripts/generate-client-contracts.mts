/// <reference types="node" />
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ZodTypeAny } from 'zod';
import { createAuxiliaryTypeStore, createTypeAlias, printNode, zodToTs } from 'zod-to-ts';
import {
  authResultContract,
  categoryContract,
  eventContract,
  oauthAccountContract,
  oauthAccountsContract,
  offerContract,
  offersResultContract,
  publicUserContract,
  trashItemContract,
  userContract,
  wishItemContract,
  wishlistContentContract,
  wishlistContract,
} from '../src/utils/contracts';


const here = dirname(fileURLToPath(import.meta.url));
const outputFile = resolve(here, '../../client/src/types/api-contract.ts');

const entries: Array<[string, ZodTypeAny]> = [
  ['ApiPublicUser', publicUserContract],
  ['ApiCategory', categoryContract],
  ['ApiWishItem', wishItemContract],
  ['ApiTrashItem', trashItemContract],
  ['ApiWishlist', wishlistContract],
  ['ApiOffer', offerContract],
  ['ApiOffersResult', offersResultContract],
  ['ApiAuthResult', authResultContract],
  ['ApiWishlistContent', wishlistContentContract],
  ['ApiEvent', eventContract],
  ['ApiUser', userContract],
  ['ApiOAuthAccount', oauthAccountContract],
  ['ApiOAuthAccounts', oauthAccountsContract],
];

const header = `/**
 * AUTO-GENERATED FILE — не редактировать вручную.
 *
 * Источник: server/src/utils/contracts.ts (zod-схемы публичного API).
 * Перегенерация: cd server && npm run contracts:generate
 * Проверка в CI:  cd server && npm run contracts:check
 */

`;

const body = entries
  .map(([name, schema]) => {
    const auxiliaryTypeStore = createAuxiliaryTypeStore();
    const { node } = zodToTs(schema, { auxiliaryTypeStore });
    return printNode(createTypeAlias(node, name)).replace(/^type /, 'export type ');
  })
  .join('\n\n');

const content = `${header}${body}\n`;

if (process.argv.includes('--check')) {
  let current = '';
  try {
    current = readFileSync(outputFile, 'utf8');
  } catch {
    current = '';
  }
  if (current !== content) {
    console.error(
      'client/src/types/api-contract.ts устарел. Выполните: cd server && npm run contracts:generate',
    );
    process.exit(1);
  }
  console.log('Контракты клиента актуальны.');
} else {
  writeFileSync(outputFile, content);
  console.log(`Сгенерировано: ${outputFile}`);
}
