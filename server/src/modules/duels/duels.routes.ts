import { Router } from 'express';
import { CreateDuelRequest, JoinDuelRequest } from '@luna/shared';
import { requireAuth, authedUserId } from '../../middleware/requireAuth';
import { validateBody, validateObjectIdParam } from '../../middleware/validate';
import { duelJoinLimiter } from '../../middleware/rateLimit';
import { ok } from '../../lib/http';
import * as duels from './duels.service';

export const duelsRouter = Router();

duelsRouter.use(requireAuth);
duelsRouter.param('id', (req, res, next) => validateObjectIdParam('id')(req, res, next));

duelsRouter.get('/', async (req, res) => ok(res, await duels.listDuels(authedUserId(req))));
duelsRouter.post('/', validateBody(CreateDuelRequest), async (req, res) =>
  ok(res, await duels.createDuel(authedUserId(req), req.body.format), 201),
);
duelsRouter.post('/join', duelJoinLimiter, validateBody(JoinDuelRequest), async (req, res) => {
  ok(res, await duels.joinDuel(authedUserId(req), req.body.code));
});
duelsRouter.get('/:id', async (req, res) => {
  ok(res, await duels.getDuel(authedUserId(req), req.params.id as string));
});
duelsRouter.post('/:id/play', async (req, res) => {
  ok(res, await duels.playDuel(authedUserId(req), req.params.id as string));
});
