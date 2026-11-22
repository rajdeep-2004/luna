import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { AuthResponse, LoginRequest, RegisterRequest } from '@luna/shared';
import { env } from '../../config/env';
import { AppError, isDuplicateKey } from '../../lib/errors';
import { usersRepo } from '../users/users.repository';
import { toPublicUser } from '../users/users.mapper';

const BCRYPT_COST = 12;
// Compared against when the email doesn't exist, so a wrong email takes as long as a wrong password.
const DUMMY_HASH = bcrypt.hashSync('luna-timing-equaliser', BCRYPT_COST);

function signToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export async function register(input: RegisterRequest): Promise<AuthResponse> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  try {
    const user = await usersRepo.create({ email: input.email, username: input.username, passwordHash });
    return { token: signToken(user._id.toString()), user: toPublicUser(user) };
  } catch (err) {
    if (isDuplicateKey(err)) {
      const field = Object.keys((err as { keyPattern?: object }).keyPattern ?? {})[0];
      throw new AppError(
        'CONFLICT',
        field === 'email' ? 'An account with this email already exists' : 'That username is taken',
      );
    }
    throw err;
  }
}

export async function login(input: LoginRequest): Promise<AuthResponse> {
  const user = await usersRepo.findByEmailWithPassword(input.email);
  const valid = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) throw new AppError('UNAUTHORIZED', 'Email or password is incorrect');
  return { token: signToken(user._id.toString()), user: toPublicUser(user) };
}
