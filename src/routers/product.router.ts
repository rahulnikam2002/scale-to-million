import { Router } from 'express';
import * as writeController from '../controllers/product.controller.js';
import * as readController from '../controllers/product.read.controller.js';

const router = Router();

// Stage 5 — CQRS: write and read paths are fully separated.
// Write path: primary DB → write service → write controller
// Read path:  replica DB → Redis cache → read service → read controller
router.post('/', writeController.createProduct);
router.get('/', readController.getProducts);

export default router;
