import { Router } from 'express';
import { PageQuery } from '@luna/shared';
import { requireAuth, authedUserId } from '../../middleware/requireAuth';
import { parseQuery } from '../../middleware/validate';
import { ok } from '../../lib/http';
import { weeklyBoard } from './leaderboard.service';

export const leaderboardRouter = Router();

leaderboardRouter.use(requireAuth);
leaderboardRouter.get('/weekly', async (req, res) => {
  ok(res, await weeklyBoard(authedUserId(req), parseQuery(PageQuery, req.query)));
});
