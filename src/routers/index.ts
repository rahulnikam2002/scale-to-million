import { Router } from 'express';
import productRouter from './product.router.js';
import healthRouter from './health.router.js';

const router = Router();

router.use('/products', productRouter);
router.use('/health', healthRouter);

export default router;
