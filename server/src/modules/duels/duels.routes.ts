import { Router } from 'express';
import { CreateDuelRequest, JoinDuelRequest, PageQuery } from '@luna/shared';
import { requireAuth, authedUserId } from '../../middleware/requireAuth';
import { parseQuery, validateBody, validateObjectIdParam } from '../../middleware/validate';
import { duelJoinLimiter } from '../../middleware/rateLimit';
import { ok } from '../../lib/http';
import * as duels from './duels.service';

/** Live duels (D-052): REST sets a duel up and reads it; the match runs over the socket. */
export const duelsRouter = Router();

duelsRouter.use(requireAuth);
duelsRouter.param('id', (req, res, next) => validateObjectIdParam('id')(req, res, next));

duelsRouter.get('/', async (req, res) =>
  ok(res, await duels.listDuels(authedUserId(req), parseQuery(PageQuery, req.query))),
);
duelsRouter.post('/', validateBody(CreateDuelRequest), async (req, res) =>
  ok(res, await duels.createDuel(authedUserId(req), req.body.format), 201),
);
duelsRouter.post('/join', duelJoinLimiter, validateBody(JoinDuelRequest), async (req, res) => {
  ok(res, await duels.joinDuel(authedUserId(req), req.body.code));
});
duelsRouter.post('/:id/cancel', async (req, res) => {
  ok(res, await duels.cancelDuel(authedUserId(req), req.params.id as string));
});
duelsRouter.get('/:id', async (req, res) => {
  ok(res, await duels.getDuel(authedUserId(req), req.params.id as string));
});
