import { Router } from 'express';
import { LoginRequest, RegisterRequest } from '@luna/shared';
import { validateBody } from '../../middleware/validate';
import { authLimiter } from '../../middleware/rateLimit';
import { ok } from '../../lib/http';
import * as auth from './auth.service';

export const authRouter = Router();

authRouter.use(authLimiter);
authRouter.post('/register', validateBody(RegisterRequest), async (req, res) => {
  ok(res, await auth.register(req.body), 201);
});
authRouter.post('/login', validateBody(LoginRequest), async (req, res) => {
  ok(res, await auth.login(req.body));
});
