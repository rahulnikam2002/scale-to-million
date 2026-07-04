import { replicaPool, primaryPool } from '../config/database.js';
import { encodeCursor } from '../shared/utils/cursor.js';
import { mapProductRow } from './product.repository.js';
import type { GetProductsInput, ProductsPage } from '../shared/types/product.types.js';

interface ProductRow {
  id: string;
  name: string;
  category: string;
  price: string;
  stock: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: Date;
}

// Stage 6 — Read Replicas:
// Queries run against replicaPool. When PG_REPLICA_HOST is configured, all read
// traffic is automatically routed to the replica, reducing load on the primary.
export async function findProducts(input: GetProductsInput): Promise<ProductsPage> {
  const { limit, cursor, category, status } = input;
  const params: unknown[] = [limit + 1];
  const conditions: string[] = [];

  if (cursor !== undefined) {
    params.push(cursor);
    conditions.push(`id > $${params.length}`);
  }

  if (category) {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await replicaPool.query<ProductRow>(
    `SELECT id, name, category, price, stock, status, created_at
     FROM products
     ${where}
     ORDER BY id ASC
     LIMIT $1`,
    params
  );

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const products = pageRows.map(mapProductRow);
  const nextCursor = hasMore ? encodeCursor(products[products.length - 1].id) : null;

  return { products, nextCursor, hasMore };
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await primaryPool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
