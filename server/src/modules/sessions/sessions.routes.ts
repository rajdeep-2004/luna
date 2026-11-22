import { Router } from 'express';
import { HintRequest, StartSessionRequest, SubmitAnswerRequest } from '@luna/shared';
import { requireAuth, authedUserId } from '../../middleware/requireAuth';
import { validateBody, validateObjectIdParam } from '../../middleware/validate';
import { ok } from '../../lib/http';
import * as sessions from './sessions.service';

export const sessionsRouter = Router();

sessionsRouter.use(requireAuth);
sessionsRouter.param('id', (req, res, next) => validateObjectIdParam('id')(req, res, next));

sessionsRouter.post('/', validateBody(StartSessionRequest), async (req, res) => {
  ok(res, await sessions.startSession(authedUserId(req), req.body), 201);
});
sessionsRouter.get('/:id', async (req, res) => {
  ok(res, await sessions.getSession(authedUserId(req), req.params.id as string));
});
sessionsRouter.post('/:id/answers', validateBody(SubmitAnswerRequest), async (req, res) => {
  ok(res, await sessions.submitAnswer(authedUserId(req), req.params.id as string, req.body));
});
sessionsRouter.post('/:id/hint', validateBody(HintRequest), async (req, res) => {
  ok(res, await sessions.revealHint(authedUserId(req), req.params.id as string, req.body));
});
sessionsRouter.post('/:id/complete', async (req, res) => {
  ok(res, await sessions.completeSession(authedUserId(req), req.params.id as string));
});
