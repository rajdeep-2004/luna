import { Router } from 'express';
import { PageQuery, UpdateMeRequest } from '@luna/shared';
import { requireAuth, authedUserId } from '../../middleware/requireAuth';
import { parseQuery, validateBody } from '../../middleware/validate';
import { ok } from '../../lib/http';
import * as users from './users.service';
import { getProgress } from '../progress/progress.service';
import { sessionHistory } from '../sessions/sessions.history';
import { listAchievements } from '../achievements/achievements.service';

export const usersRouter = Router();

usersRouter.use(requireAuth);
usersRouter.get('/me', async (req, res) => ok(res, await users.getMe(authedUserId(req))));
usersRouter.get('/me/progress', async (req, res) => ok(res, await getProgress(authedUserId(req))));
usersRouter.get('/me/sessions', async (req, res) => {
  ok(res, await sessionHistory(authedUserId(req), parseQuery(PageQuery, req.query)));
});
usersRouter.get('/me/achievements', async (req, res) =>
  ok(res, await listAchievements(authedUserId(req))),
);
usersRouter.patch('/me', validateBody(UpdateMeRequest), async (req, res) => {
  ok(res, await users.updateMe(authedUserId(req), req.body));
});
