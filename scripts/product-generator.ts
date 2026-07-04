import { CATEGORIES, ADJECTIVES, NOUNS_BY_CATEGORY } from './constants.js';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[] | T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function randomPastDate(maxDaysAgo: number): string {
  const ms = randomInt(0, maxDaysAgo * 24 * 60 * 60 * 1000);
  return new Date(Date.now() - ms).toISOString();
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function generateProductCsvRow(): string {
  const category = pick(CATEGORIES);
  const nouns = NOUNS_BY_CATEGORY[category] ?? ['Product'];
  const name = escapeCsvField(`${pick(ADJECTIVES)} ${pick(nouns)}`);
  const price = randomInt(100, 100000);
  const stock = randomInt(0, 1000);
  const status = Math.random() < 0.9 ? 'ACTIVE' : 'INACTIVE';
  const createdAt = randomPastDate(3 * 365);
  const updatedAt = randomPastDate(365);

  return `${name},${category},${price},${stock},${status},${createdAt},${updatedAt}`;
}
