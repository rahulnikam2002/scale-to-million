import type { Request, Response, NextFunction } from 'express';
import * as readService from '../services/product.read.service.js';
import { sendSuccess } from '../shared/utils/response.js';

export async function getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = await readService.getProducts(req.query);
    sendSuccess(res, page, 'Products retrieved successfully.');
  } catch (err) {
    next(err);
  }
}
