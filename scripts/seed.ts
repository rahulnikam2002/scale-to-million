import { Pool } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import { Readable } from 'stream';
import dotenv from 'dotenv';
import { TOTAL_RECORDS, BATCH_SIZE } from './constants.js';
import { generateProductCsvRow } from './product-generator.js';

dotenv.config();

const pool = new Pool({
  host: process.env.PG_HOST ?? 'localhost',
  port: parseInt(process.env.PG_PORT ?? '5432', 10),
  database: process.env.PG_DATABASE ?? 'api_that_scale',
  user: process.env.PG_USER ?? 'postgres',
  password: process.env.PG_PASSWORD,
  max: 2,
});

async function getExistingCount(): Promise<number> {
  const { rows } = await pool.query<{ count: string }>('SELECT COUNT(*) AS count FROM products');
  return parseInt(rows[0].count, 10);
}

async function insertBatch(batchSize: number): Promise<void> {
  const client = await pool.connect();
  try {
    const copyStream = client.query(
      copyFrom(
        'COPY products (name, category, price, stock, status, created_at, updated_at) FROM STDIN WITH (FORMAT CSV)'
      )
    );

    let rowIndex = 0;
    const readable = new Readable({
      read() {
        while (rowIndex < batchSize) {
          this.push(generateProductCsvRow() + '\n');
          rowIndex++;
        }
        this.push(null);
      },
    });

    await new Promise<void>((resolve, reject) => {
      readable.on('error', reject);
      copyStream.on('error', reject);
      copyStream.on('finish', resolve);
      readable.pipe(copyStream);
    });
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  if (isNaN(TOTAL_RECORDS) || TOTAL_RECORDS <= 0) {
    throw new Error(`Invalid TOTAL_RECORDS: ${TOTAL_RECORDS}`);
  }
  if (isNaN(BATCH_SIZE) || BATCH_SIZE <= 0) {
    throw new Error(`Invalid BATCH_SIZE: ${BATCH_SIZE}`);
  }

  console.log('Seeder started');
  console.log(`Target: ${TOTAL_RECORDS.toLocaleString()} records  |  Batch size: ${BATCH_SIZE.toLocaleString()}`);

  const existing = await getExistingCount();
  const remaining = TOTAL_RECORDS - existing;

  if (remaining <= 0) {
    console.log(`Already have ${existing.toLocaleString()} records. Nothing to insert.`);
    await pool.end();
    return;
  }

  console.log(`Existing: ${existing.toLocaleString()}  |  To insert: ${remaining.toLocaleString()}`);

  const startTime = Date.now();
  let inserted = 0;

  while (inserted < remaining) {
    const batchCount = Math.min(BATCH_SIZE, remaining - inserted);
    await insertBatch(batchCount);
    inserted += batchCount;

    const total = existing + inserted;
    const percent = ((total / TOTAL_RECORDS) * 100).toFixed(2);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Inserted ${total.toLocaleString()} / ${TOTAL_RECORDS.toLocaleString()} (${percent}%) | ${elapsed}s elapsed`);
  }

  const minutes = ((Date.now() - startTime) / 60000).toFixed(2);
  console.log(`\nCompleted. ${(existing + inserted).toLocaleString()} total records in ${minutes} minutes.`);

  await pool.end();
}

main().catch((err: Error) => {
  console.error('Seeder failed:', err.message);
  process.exit(1);
});
