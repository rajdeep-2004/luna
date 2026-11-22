import { Router } from 'express';
import { requireAuth, authedUserId } from '../../middleware/requireAuth';
import { ok } from '../../lib/http';
import { getDaily } from './daily.service';

export const dailyRouter = Router();

dailyRouter.use(requireAuth);
dailyRouter.get('/', async (req, res) => ok(res, await getDaily(authedUserId(req))));
