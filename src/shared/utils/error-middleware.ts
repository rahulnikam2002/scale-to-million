import type { Request, Response, NextFunction } from 'express';
import { AppError } from './app-error.js';
import { logger } from '../../config/logger.js';

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
    return;
  }

  logger.error({ err }, 'Unexpected error');
  res.status(500).json({ success: false, message: 'Internal server error.' });
}
