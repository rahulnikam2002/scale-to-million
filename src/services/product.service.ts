import { z } from 'zod';
import * as writeRepository from '../repositories/product.repository.js';
import { redisClient } from '../config/redis.js';
import { AppError } from '../shared/utils/app-error.js';
import type { Product } from '../shared/types/product.types.js';

const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  price: z.number().positive(),
  category: z.string().min(1).max(100),
  stock: z.number().int().min(0),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export async function createProduct(body: unknown): Promise<Product> {
  const result = createProductSchema.safeParse(body);
  if (!result.success) {
    throw new AppError('Validation failed.', 400, result.error.issues);
  }

  const product = await writeRepository.insertProduct(result.data);
  await invalidateProductCache();
  return product;
}

async function invalidateProductCache(): Promise<void> {
  if (!redisClient) return;
  try {
    const keys = await redisClient.keys('products:*');
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch {
    // Cache invalidation failure must not block writes
  }
}

