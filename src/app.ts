import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { logger } from './config/logger.js';
import router from './routers/index.js';
import { errorMiddleware } from './shared/utils/error-middleware.js';

const app = express();

app.use(helmet());
app.use(compression() as express.RequestHandler);
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }) as express.RequestHandler);

app.use('/', router);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

app.use(errorMiddleware);

export default app;
