# API That Scales

A backend API built to demonstrate how production systems evolve as database size grows from a few thousand rows to **10 million+ records**. The project intentionally exposes only two endpoints and focuses entirely on scalability concepts used by engineering teams at large technology companies.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
  - [Request Lifecycle](#request-lifecycle)
  - [CQRS — Read / Write Separation](#cqrs--read--write-separation)
  - [Cursor Pagination](#cursor-pagination)
  - [Redis Caching](#redis-caching)
  - [Read Replicas](#read-replicas)
  - [Replication Lag](#replication-lag)
- [Database Schema](#database-schema)
- [API Contracts](#api-contracts)
  - [GET /health](#get-health)
  - [POST /products](#post-products)
  - [GET /products](#get-products)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [Seeder](#seeder)
- [Scalability Stages](#scalability-stages)

---

## Tech Stack

| Concern | Technology |
|---|---|
| Runtime | Node.js (LTS) |
| Framework | Express.js v5 |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| Validation | Zod |
| Logging | Pino |
| ORM / Query | `pg` (raw SQL, no ORM) |
| Bulk Insert | `pg-copy-streams` (PostgreSQL COPY protocol) |
| Security | Helmet, CORS |
| Compression | compression middleware |
| Containerization | Docker Compose |

---

## Architecture

```
                        Client
                           │
                    Load Balancer
                           │
          ┌────────────────┴────────────────┐
          │                                 │
     API Instance                     API Instance
          │                                 │
   ┌──────┴──────┐                   ┌──────┴──────┐
   │             │                   │             │
Write Path   Read Path           Write Path   Read Path
   │             │                   │             │
   │         Redis Cache             │         Redis Cache
   │             │                   │             │
Primary DB   Replica DB         Primary DB   Replica DB
```

At its current stage, the project runs with a single PostgreSQL instance acting as both primary and replica. The code structure is fully prepared to point the replica pool at a real replica with a single environment variable change.

---

## Project Structure

```
src/
├── config/
│   ├── constants.ts        # DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, CACHE_TTL
│   ├── database.ts         # primaryPool (writes) + replicaPool (reads)
│   ├── env.ts              # Environment variable validation
│   ├── logger.ts           # Pino logger instance
│   └── redis.ts            # Redis client + connect function
│
├── controllers/
│   ├── health.controller.ts        # GET /health
│   ├── product.controller.ts       # POST /products  (write)
│   └── product.read.controller.ts  # GET  /products  (read)
│
├── repositories/
│   ├── product.repository.ts       # insertProduct()  — uses primaryPool
│   └── product.read.repository.ts  # findProducts()   — uses replicaPool
│
├── routers/
│   ├── health.router.ts
│   ├── product.router.ts   # Routes POST → write controller, GET → read controller
│   └── index.ts
│
├── services/
│   ├── product.service.ts          # createProduct() — validation + cache invalidation
│   └── product.read.service.ts     # getProducts()   — Redis cache + pagination
│
├── shared/
│   ├── types/
│   │   ├── api.types.ts      # ApiSuccess / ApiError response types
│   │   └── product.types.ts  # Product, CreateProductInput, GetProductsInput, ProductsPage
│   └── utils/
│       ├── app-error.ts        # AppError class (message + statusCode + errors)
│       ├── cursor.ts           # encodeCursor() / decodeCursor() (base64 ↔ id)
│       ├── error-middleware.ts # Global Express error handler
│       └── response.ts         # sendSuccess() / sendError() helpers
│
├── app.ts      # Express app setup (middleware + routes)
└── server.ts   # Startup: connect DB + Redis, start HTTP server

scripts/
├── constants.ts          # TOTAL_RECORDS, BATCH_SIZE, product data arrays
├── product-generator.ts  # Pure Math.random() CSV row generator (no faker)
└── seed.ts               # Bulk seeder using PostgreSQL COPY protocol
```

---

## How It Works

### Request Lifecycle

Every request flows strictly downward through the layers. No layer skips another or communicates upward.

```
HTTP Request
     │
  Router         — maps URL to the correct controller
     │
Controller       — reads req, calls service, sends response
     │
  Service        — validates input, handles cache, calls repository
     │
Repository       — executes SQL query against the database
     │
 Database / Redis
```

Controllers never touch the database. Repositories never format HTTP responses. Services never know about Express.

---

### CQRS — Read / Write Separation

The project implements **Command Query Responsibility Segregation** at the file level. Every layer is split into a read side and a write side.

```
POST /products
  → product.router.ts
  → product.controller.ts       (write)
  → product.service.ts          (write)
  → product.repository.ts       (write)
  → primaryPool → PostgreSQL Primary

GET /products
  → product.router.ts
  → product.read.controller.ts  (read)
  → product.read.service.ts     (read)
  → product.read.repository.ts  (read)
  → replicaPool → PostgreSQL Replica
```

This separation allows each path to evolve independently — read queries can be tuned without touching write logic, and read traffic can be routed to dedicated replicas without changing business logic.

---

### Cursor Pagination

The API uses cursor-based pagination instead of `OFFSET`. Offset pagination requires the database to scan and discard rows, which becomes increasingly expensive as the table grows.

**How it works:**

1. The client sends a request without a cursor for the first page.
2. The response includes a `nextCursor` value (a base64-encoded product `id`).
3. The client passes that cursor on the next request to continue from where it left off.

**SQL executed:**

```sql
SELECT id, name, category, price, stock, status, created_at
FROM products
WHERE id > $cursor          -- skip everything already seen
  AND category = $category  -- optional filter (uses composite index)
  AND status = $status      -- optional filter (uses composite index)
ORDER BY id ASC
LIMIT $limit + 1            -- fetch one extra to detect if there is a next page
```

Fetching `limit + 1` rows is the "has next page" trick — if the result contains more rows than the limit, there is a next page and the extra row is discarded.

**Cursor encoding/decoding** (`src/shared/utils/cursor.ts`):

```
id 42  →  Buffer.from("42").toString("base64")  →  "NDI="
"NDI=" →  Buffer.from("NDI=", "base64").toString("utf8")  →  "42"  →  parseInt → 42
```

The cursor is opaque to the client — they treat it as a string token and pass it back as-is.

---

### Redis Caching

Only `GET /products` responses are cached. Write operations are never cached.

**Cache key format:**

```
products:limit:{n}:cursor:{id}:category:{val}:status:{val}
```

Example keys:
```
products:limit:20:cursor::category::status:
products:limit:10:cursor:500:category:Electronics:status:ACTIVE
```

**Request flow:**

```
GET /products
     │
     ▼
 Redis lookup
     │
     ├── Cache HIT  → return cached response immediately (no DB query)
     │
     └── Cache MISS
              │
              ▼
         replicaPool query
              │
              ▼
         Store result in Redis (TTL: 300 seconds)
              │
              ▼
         Return response
```

**Cache invalidation:**

Every `POST /products` deletes all keys matching `products:*` from Redis using `KEYS` + `DEL`. This ensures the next read reflects the newly created product.

> **Important:** The seeder script inserts data directly into PostgreSQL via the COPY protocol, bypassing the API. It does not trigger cache invalidation. After running the seeder, flush Redis manually: `docker exec api-that-scale-redis redis-cli FLUSHALL`

---

### Read Replicas

`src/config/database.ts` exports two separate connection pools:

```typescript
// Writes always go to primary
export const primaryPool = new Pool({ host: env.pgHost, ... });

// Reads go to replica (falls back to primary if PG_REPLICA_HOST is not set)
export const replicaPool = new Pool({ host: env.pgReplicaHost, ... });
```

`pgReplicaHost` resolves as:
```
PG_REPLICA_HOST  (if set)
  ↓ else
PG_HOST
  ↓ else
localhost
```

To enable read replicas in production, set `PG_REPLICA_HOST` to the replica's hostname. No code changes are required.

---

### Replication Lag

In asynchronous replication, a record written to the primary may not immediately appear on the replica. This creates a window where a `POST /products` succeeds but a subsequent `GET /products` returns stale data.

**How this project handles it:**

`insertProduct()` uses `INSERT ... RETURNING` to return the created product directly from the primary database write. The write service returns this result to the caller without ever querying the replica.

```sql
INSERT INTO products (name, category, price, stock, status)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, name, category, price, stock, status, created_at
```

The client receives the full created product in the `POST` response — there is no need to re-read from the replica. This is the **Read After Write** pattern.

---

## Database Schema

```sql
CREATE TABLE products (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255)   NOT NULL,
    category    VARCHAR(100)   NOT NULL,
    price       NUMERIC(10,2)  NOT NULL CHECK (price >= 0),
    stock       INTEGER        NOT NULL DEFAULT 0 CHECK (stock >= 0),
    status      VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE'
                               CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Single-column indexes for filtered queries
CREATE INDEX idx_products_category    ON products (category);
CREATE INDEX idx_products_status      ON products (status);
CREATE INDEX idx_products_created_at  ON products (created_at);

-- Composite indexes for cursor pagination with filters
-- e.g. WHERE category = 'Electronics' AND id > 500 ORDER BY id
CREATE INDEX idx_products_category_id ON products (category, id);
CREATE INDEX idx_products_status_id   ON products (status, id);
```

---

## API Contracts

All endpoints return a consistent envelope:

**Success**
```json
{
  "success": true,
  "message": "Human-readable message.",
  "data": {}
}
```

**Failure**
```json
{
  "success": false,
  "message": "Human-readable message.",
  "errors": []
}
```

---

### GET /health

Returns the operational status of the application and its dependencies.

**Request**
```
GET /health
```

**Response — 200 OK (all healthy)**
```json
{
  "success": true,
  "message": "Healthy",
  "data": {
    "status": "healthy",
    "database": "connected",
    "redis": "connected"
  }
}
```

**Response — 503 Service Unavailable (degraded)**
```json
{
  "success": false,
  "message": "Degraded",
  "data": {
    "status": "degraded",
    "database": "disconnected",
    "redis": "connected"
  }
}
```

---

### POST /products

Creates a new product. Writes to the primary database and invalidates the Redis product cache.

**Request**
```
POST /products
Content-Type: application/json
```

**Request Body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | ✅ | 1–255 characters |
| `price` | number | ✅ | Positive number |
| `category` | string | ✅ | 1–100 characters |
| `stock` | integer | ✅ | ≥ 0 |
| `status` | string | ❌ | `ACTIVE` or `INACTIVE` (default: `ACTIVE`) |

```json
{
  "name": "Wireless Mechanical Keyboard",
  "price": 4999,
  "category": "Electronics",
  "stock": 150,
  "status": "ACTIVE"
}
```

**Response — 201 Created**
```json
{
  "success": true,
  "message": "Product created successfully.",
  "data": {
    "id": 11,
    "name": "Wireless Mechanical Keyboard",
    "category": "Electronics",
    "price": 4999,
    "stock": 150,
    "status": "ACTIVE",
    "created_at": "2026-07-04T10:30:00.000Z"
  }
}
```

**Response — 400 Bad Request**
```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    {
      "code": "too_small",
      "path": ["price"],
      "message": "Number must be greater than 0"
    }
  ]
}
```

---

### GET /products

Returns a paginated list of products. Reads from Redis cache first; falls back to the replica database on a cache miss.

**Request**
```
GET /products
GET /products?limit=10
GET /products?cursor=NDI=
GET /products?category=Electronics
GET /products?status=ACTIVE
GET /products?limit=10&category=Electronics&status=ACTIVE&cursor=NDI=
```

**Query Parameters**

| Parameter | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `limit` | integer | ❌ | `20` | 1–100 |
| `cursor` | string | ❌ | — | Opaque base64 token from a previous response |
| `category` | string | ❌ | — | Exact match filter |
| `status` | string | ❌ | — | `ACTIVE` or `INACTIVE` |

**Response — 200 OK (first page)**
```json
{
  "success": true,
  "message": "Products retrieved successfully.",
  "data": {
    "products": [
      {
        "id": 1,
        "name": "Budget Basketball",
        "category": "Sports",
        "price": 20950,
        "stock": 78,
        "status": "ACTIVE",
        "created_at": "2024-12-24T08:02:14.230Z"
      }
    ],
    "nextCursor": "MTA=",
    "hasMore": true
  }
}
```

**Response — 200 OK (last page)**
```json
{
  "success": true,
  "message": "Products retrieved successfully.",
  "data": {
    "products": [...],
    "nextCursor": null,
    "hasMore": false
  }
}
```

**Pagination walkthrough:**

```
# First page (no cursor)
GET /products?limit=5
→ returns products 1–5, nextCursor: "NQ=="

# Second page
GET /products?limit=5&cursor=NQ==
→ returns products 6–10, nextCursor: "MTA="

# Third page (last)
GET /products?limit=5&cursor=MTA=
→ returns products 11–13, nextCursor: null, hasMore: false
```

**Response — 400 Bad Request**
```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    {
      "code": "too_big",
      "path": ["limit"],
      "message": "Number must be less than or equal to 100"
    }
  ]
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | ❌ | `5000` | HTTP server port |
| `NODE_ENV` | ❌ | `development` | `development` or `production` |
| `PG_HOST` | ❌ | `localhost` | PostgreSQL primary host |
| `PG_PORT` | ❌ | `5432` | PostgreSQL primary port |
| `PG_DATABASE` | ❌ | `api_that_scale` | Database name |
| `PG_USER` | ❌ | `postgres` | Database user |
| `PG_PASSWORD` | ✅ | — | Database password |
| `PG_REPLICA_HOST` | ❌ | `PG_HOST` | Replica host — falls back to primary if not set |
| `PG_REPLICA_PORT` | ❌ | `PG_PORT` | Replica port |
| `REDIS_URL` | ❌ | `redis://localhost:6379` | Redis connection URL |

---

## Running the Project

**Prerequisites:** Docker Desktop, Node.js LTS

**1. Clone and install dependencies**
```bash
npm install
```

**2. Copy environment file**
```bash
cp .env.example .env
```

**3. Start all services**
```bash
docker compose up -d
```

This starts PostgreSQL, Redis, pgAdmin, and the API container. The `init-postgres.sql` script runs automatically on first start to create the `products` table and all indexes.

**4. Verify everything is running**
```bash
curl http://localhost:5000/health
```

**Services:**

| Service | URL |
|---|---|
| API | http://localhost:5000 |
| pgAdmin | http://localhost:8080 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

## Seeder

The seeder inserts records directly into PostgreSQL using the COPY protocol (the fastest bulk insert method available — significantly faster than individual `INSERT` statements).

Data is generated using pure `Math.random()` combinations of adjectives, nouns, and categories. No external library is used.

**Seed 10 records (testing)**
```powershell
$env:TOTAL_RECORDS="10"; $env:BATCH_SIZE="10"; npx tsx scripts/seed.ts
```

**Seed 100,000 records**
```powershell
$env:TOTAL_RECORDS="100000"; $env:BATCH_SIZE="5000"; npx tsx scripts/seed.ts
```

**Seed 10,000,000 records**
```powershell
npx tsx scripts/seed.ts
```

The seeder is resume-safe — it counts existing rows and only inserts the remaining records. After seeding, flush the Redis cache:

```bash
docker exec api-that-scale-redis redis-cli FLUSHALL
```

---

## Scalability Stages

The project implements these stages in order:

| Stage | Optimization | Status |
|---|---|---|
| 1 | Basic Express API + PostgreSQL | ✅ |
| 2 | Database indexes (single + composite) | ✅ |
| 3 | Cursor pagination (no OFFSET) | ✅ |
| 4 | Query optimization (SELECT only needed columns, push filters to DB) | ✅ |
| 5 | CQRS — separate read and write paths at every layer | ✅ |
| 6 | Read replicas — `replicaPool` for reads, `primaryPool` for writes | ✅ |
| 7 | Replication lag — Read After Write pattern via `INSERT RETURNING` | ✅ |
| 8 | Redis cache — TTL-based caching with post-write invalidation | ✅ |
| 9 | Multi-region databases | Conceptual |
| 10 | Horizontal API scaling | Stateless design ready |


 $env:TOTAL_RECORDS="1000000"; $env:BATCH_SIZE="5000"; npx tsx scripts/seed.ts