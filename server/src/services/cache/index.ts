import { env } from '../../config/env';
import { MemoryCache } from './memory.cache';
import { RedisRestCache } from './redis-rest.cache';
import type { CacheStore } from './types';

const memory = new MemoryCache(2000);

export const sharedCache: CacheStore =
  env.redisRestUrl !== '' && env.redisRestToken !== ''
    ? new RedisRestCache(env.redisRestUrl, env.redisRestToken, memory)
    : memory;

export type { CacheStore };
