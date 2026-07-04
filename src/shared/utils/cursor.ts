export function encodeCursor(id: number): string {
  return Buffer.from(String(id)).toString('base64');
}

export function decodeCursor(cursor: string): number {
  const decoded = parseInt(Buffer.from(cursor, 'base64').toString('utf8'), 10);
  if (isNaN(decoded) || decoded <= 0) throw new Error('Invalid cursor value');
  return decoded;
}
