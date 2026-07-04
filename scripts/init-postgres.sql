DROP TABLE IF EXISTS products;

CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(255) NOT NULL,

    category VARCHAR(100) NOT NULL,

    price NUMERIC(10,2) NOT NULL
        CHECK (price >= 0),

    stock INTEGER NOT NULL DEFAULT 0
        CHECK (stock >= 0),

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'INACTIVE')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for cursor pagination and filtered queries
CREATE INDEX idx_products_category ON products (category);
CREATE INDEX idx_products_status ON products (status);
CREATE INDEX idx_products_created_at ON products (created_at);

-- Composite indexes for common filter + cursor patterns
CREATE INDEX idx_products_category_id ON products (category, id);
CREATE INDEX idx_products_status_id ON products (status, id);