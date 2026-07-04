import type { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, message: string, status = 200): void {
  res.status(status).json({ success: true, message, data });
}

export function sendError(res: Response, message: string, status = 500, errors?: unknown[]): void {
  res.status(status).json({ success: false, message, ...(errors && { errors }) });
}
