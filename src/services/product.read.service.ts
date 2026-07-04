import { z } from 'zod';
import * as readRepository from '../repositories/product.read.repository.js';
import { redisClient } from '../config/redis.js';
import { decodeCursor } from '../shared/utils/cursor.js';
import { AppError } from '../shared/utils/app-error.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, CACHE_TTL } from '../config/constants.js';
import type { ProductsPage } from '../shared/types/product.types.js';

const getProductsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  cursor: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export async function getProducts(query: unknown): Promise<ProductsPage> {
  const result = getProductsSchema.safeParse(query);
  if (!result.success) {
    throw new AppError('Validation failed.', 400, result.error.issues);
  }

  const { limit, cursor: rawCursor, category, status } = result.data;

  let cursor: number | undefined;
  if (rawCursor) {
    try {
      cursor = decodeCursor(rawCursor);
    } catch {
      throw new AppError('Invalid cursor.', 400);
    }
  }

  const cacheKey = buildCacheKey({ limit, cursor, category, status });

  const cached = redisClient ? await redisClient.get(cacheKey).catch(() => null) : null;
  if (cached) {
    return JSON.parse(cached) as ProductsPage;
  }

  // Cache miss — query the replica (Stage 6)
  const page = await readRepository.findProducts({ limit, cursor, category, status });

  if (redisClient) {
    await redisClient
      .setEx(cacheKey, CACHE_TTL, JSON.stringify(page))
      .catch(() => undefined);
  }

  return page;
}

/**
 * Builds a cache key for the product list based on query parameters.
 * This ensures that different queries (e.g., different limits, cursors, categories, or statuses)
 * will have distinct cache entries.
 * eg: products:limit:10:cursor:20:category:Electronics:status:ACTIVE
 * @param params - The query parameters used to fetch the product list.
 * @returns A string that can be used as a cache key.
 */
function buildCacheKey(params: {
  limit: number;
  cursor?: number;
  category?: string;
  status?: string;
}): string {
  return [
    'products',
    `limit:${params.limit}`,
    `cursor:${params.cursor ?? ''}`,
    `category:${params.category ?? ''}`,
    `status:${params.status ?? ''}`,
  ].join(':');
}
