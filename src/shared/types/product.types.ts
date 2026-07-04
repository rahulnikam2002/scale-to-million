export type ProductStatus = 'ACTIVE' | 'INACTIVE';

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: ProductStatus;
  created_at: Date;
}

export interface CreateProductInput {
  name: string;
  price: number;
  category: string;
  stock: number;
  status: ProductStatus;
}

export interface GetProductsInput {
  limit: number;
  cursor?: number;
  category?: string;
  status?: ProductStatus;
}

export interface ProductsPage {
  products: Product[];
  nextCursor: string | null;
  hasMore: boolean;
}
