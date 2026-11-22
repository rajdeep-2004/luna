import { z } from 'zod';
import { AVATAR_IDS, EXPERIENCE_LEVELS, TOPIC_SLUGS } from './domain';

export const Username = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Use letters, numbers and underscores only');

export const Email = z.string().trim().toLowerCase().max(254).pipe(z.email('Enter a valid email'));

// bcrypt only uses the first 72 bytes of a password, so longer ones are rejected rather than truncated.
export const Password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters');

export const RegisterRequest = z.object({ email: Email, password: Password, username: Username });
export type RegisterRequest = z.infer<typeof RegisterRequest>;

export const LoginRequest = z.object({ email: Email, password: z.string().min(1).max(72) });
export type LoginRequest = z.infer<typeof LoginRequest>;

export const UpdateMeRequest = z
  .object({
    username: Username,
    avatarId: z.enum(AVATAR_IDS),
    preferredTopicSlugs: z.array(z.enum(TOPIC_SLUGS)).min(1).max(TOPIC_SLUGS.length),
    experienceLevel: z.enum(EXPERIENCE_LEVELS),
    timezone: z.string().min(1).max(64),
    completeOnboarding: z.literal(true),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Send at least one field');
export type UpdateMeRequest = z.infer<typeof UpdateMeRequest>;

export type PublicUser = {
  id: string;
  email: string;
  username: string;
  avatarId: (typeof AVATAR_IDS)[number];
  preferredTopicSlugs: (typeof TOPIC_SLUGS)[number][];
  experienceLevel: (typeof EXPERIENCE_LEVELS)[number] | null;
  timezone: string;
  onboarded: boolean;
  totalXP: number;
  level: number;
  rankName: string;
  currentStreak: number;
  longestStreak: number;
};

export type AuthResponse = { token: string; user: PublicUser };
