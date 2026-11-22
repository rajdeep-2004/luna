import { Router } from 'express';
import type { Topic } from '@luna/shared';
import { requireAuth } from '../../middleware/requireAuth';
import { ok } from '../../lib/http';
import { TopicModel } from '../../models/Topic';

export const topicsRouter = Router();

topicsRouter.use(requireAuth);
topicsRouter.get('/', async (_req, res) => {
  const topics = await TopicModel.find()
    .sort({ order: 1 })
    .select('-_id slug name description icon order')
    .lean();
  ok(res, topics as Topic[]);
});
