import { primaryPool } from '../config/database.js';
import type { Product, CreateProductInput } from '../shared/types/product.types.js';

interface ProductRow {
  id: string;
  name: string;
  category: string;
  price: string;
  stock: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: Date;
}

export function mapProductRow(row: ProductRow): Product {
  return {
    id: Number(row.id),
    name: row.name,
    category: row.category,
    price: parseFloat(row.price),
    stock: row.stock,
    status: row.status,
    created_at: row.created_at,
  };
}

// Stage 7 — Replication Lag:
// The created product is returned directly from the INSERT RETURNING clause.
// This is the "Read After Write" pattern — it bypasses the replica entirely so the
// caller immediately receives the new record without waiting for replication to catch up.
export async function insertProduct(input: CreateProductInput): Promise<Product> {
  const { rows } = await primaryPool.query<ProductRow>(
    `INSERT INTO products (name, category, price, stock, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, category, price, stock, status, created_at`,
    [input.name, input.category, input.price, input.stock, input.status]
  );
  return mapProductRow(rows[0]);
}

