import type { Request, Response, NextFunction } from 'express';
import * as writeService from '../services/product.service.js';
import { sendSuccess } from '../shared/utils/response.js';

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await writeService.createProduct(req.body);
    sendSuccess(res, product, 'Product created successfully.', 201);
  } catch (err) {
    next(err);
  }
}

