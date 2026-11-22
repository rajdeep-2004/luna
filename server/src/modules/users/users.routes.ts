import { Router } from 'express';
import { UpdateMeRequest } from '@luna/shared';
import { requireAuth, authedUserId } from '../../middleware/requireAuth';
import { validateBody } from '../../middleware/validate';
import { ok } from '../../lib/http';
import * as users from './users.service';
import { getProgress } from '../progress/progress.service';

export const usersRouter = Router();

usersRouter.use(requireAuth);
usersRouter.get('/me', async (req, res) => ok(res, await users.getMe(authedUserId(req))));
usersRouter.get('/me/progress', async (req, res) => ok(res, await getProgress(authedUserId(req))));
usersRouter.patch('/me', validateBody(UpdateMeRequest), async (req, res) => {
  ok(res, await users.updateMe(authedUserId(req), req.body));
});
