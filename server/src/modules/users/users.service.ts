import type { PublicUser, UpdateMeRequest } from '@luna/shared';
import { AppError, isDuplicateKey, notFound } from '../../lib/errors';
import { isValidTimezone } from '../../lib/time';
import { usersRepo } from './users.repository';
import { toPublicUser } from './users.mapper';
import { initTopicProgress } from '../progress/topicProgress.service';

export async function getMe(userId: string): Promise<PublicUser> {
  const user = await usersRepo.findById(userId);
  if (!user) throw new AppError('UNAUTHORIZED', 'Please log in again.');
  return toPublicUser(user);
}

export async function updateMe(userId: string, input: UpdateMeRequest): Promise<PublicUser> {
  const current = await usersRepo.findById(userId);
  if (!current) throw notFound('User');

  const set: Record<string, unknown> = {};
  if (input.username) {
    set.username = input.username;
    set.usernameLower = input.username.toLowerCase();
  }
  if (input.avatarId) set.avatarId = input.avatarId;
  if (input.preferredTopicSlugs) set.preferredTopicSlugs = [...new Set(input.preferredTopicSlugs)];
  if (input.experienceLevel) set.experienceLevel = input.experienceLevel;
  if (input.timezone) set.timezone = isValidTimezone(input.timezone) ? input.timezone : 'UTC';

  const level = input.experienceLevel ?? current.experienceLevel;
  if (input.completeOnboarding && !current.onboardedAt) {
    const topics = input.preferredTopicSlugs ?? current.preferredTopicSlugs;
    if (!level || topics.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Pick your topics and level before finishing onboarding');
    }
    set.onboardedAt = new Date();
  }

  try {
    const updated = await usersRepo.update(userId, set);
    if (!updated) throw notFound('User');
    if (set.onboardedAt && level) await initTopicProgress(userId, level);
    return toPublicUser(updated);
  } catch (err) {
    if (isDuplicateKey(err)) throw new AppError('CONFLICT', 'That username is taken');
    throw err;
  }
}
