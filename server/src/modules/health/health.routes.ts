import { Router } from 'express';
import { isDbConnected } from '../../db/connect';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  const db = isDbConnected();
  res.status(db ? 200 : 503).json({ data: { status: db ? 'ok' : 'degraded', db } });
});
