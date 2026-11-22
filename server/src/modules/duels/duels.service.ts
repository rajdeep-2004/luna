import { randomInt } from 'node:crypto';
import {
  DUEL_CODE_ALPHABET,
  type DuelListView,
  type DuelPlayerResult,
  type DuelStatus,
  type DuelView,
  type SessionView,
} from '@luna/shared';
import { DUEL } from '../../config/game';
import { shuffle } from '../../lib/random';
import { AppError, conflict, isDuplicateKey, notFound } from '../../lib/errors';
import { AnswerAttemptModel } from '../../models/AnswerAttempt';
import { DuelModel, type DuelDoc } from '../../models/Duel';
import { SessionModel } from '../../models/Session';
import { challengesRepo } from '../challenges/challenges.repository';
import { createSession, getSession } from '../sessions/sessions.service';
import { usersRepo } from '../users/users.repository';
import { toPlayerView } from '../users/users.mapper';
import { duelDifficulty, pickDuelChallenges } from './duels.selection';
import { settleDuel } from './duels.settle';

const LIVE: DuelStatus[] = ['OPEN', 'ACTIVE'];
const ENDED: DuelStatus[] = ['COMPLETED', 'EXPIRED'];

function newCode(): string {
  return Array.from(
    { length: DUEL.codeLength },
    () => DUEL_CODE_ALPHABET[randomInt(DUEL_CODE_ALPHABET.length)],
  ).join('');
}

const isParticipant = (d: DuelDoc, userId: string) =>
  d.creatorId.toString() === userId || d.opponentId?.toString() === userId;

/** Participants only: anyone else gets a 404, so duel ids don't leak (architecture §8). */
async function findOwnDuel(userId: string, duelId: string): Promise<DuelDoc> {
  const duel = await DuelModel.findById(duelId);
  if (!duel || !isParticipant(duel, userId)) throw notFound('Duel');
  return settleDuel(duel);
}

/** Per-challenge ✓/✗ and times for both players, in duel order. Only shown once a duel ends. */
async function perQuestion(duel: DuelDoc) {
  const sessions = await SessionModel.find({ duelId: duel._id }).select('userId').lean();
  const attempts = await AnswerAttemptModel.find({ sessionId: { $in: sessions.map((s) => s._id) } })
    .select('sessionId challengeId isCorrect timeTakenMs isTimeout')
    .lean();
  const forUser = (userId: string | undefined) => {
    const session = sessions.find((s) => s.userId.toString() === userId);
    if (!session) return [];
    return duel.items.map((item) => {
      const a = attempts.find(
        (x) =>
          x.sessionId.toString() === session._id.toString() &&
          x.challengeId.toString() === item.challengeId.toString(),
      );
      return {
        isCorrect: a?.isCorrect ?? false,
        timeTakenMs: a?.timeTakenMs ?? DUEL.timerMs,
        timedOut: a ? a.isTimeout : true,
      };
    });
  };
  return {
    creator: forUser(duel.creatorId.toString()),
    opponent: forUser(duel.opponentId?.toString()),
  };
}

/** Builds the caller's view of each duel with batched reads (no N+1). */
async function toViews(userId: string, duels: DuelDoc[], detail = false): Promise<DuelView[]> {
  if (!duels.length) return [];
  const ids = duels.flatMap((d) => [d.creatorId, ...(d.opponentId ? [d.opponentId] : [])]);
  const [players, mySessions] = await Promise.all([
    usersRepo.findPlayers(ids),
    SessionModel.find({ duelId: { $in: duels.map((d) => d._id) }, userId })
      .select('duelId status')
      .lean(),
  ]);
  const player = (id: { toString(): string } | null | undefined) => {
    const p = id ? players.find((x) => x._id.toString() === id.toString()) : undefined;
    return p ? toPlayerView(p) : null;
  };
  return Promise.all(
    duels.map(async (d) => {
      const isCreator = d.creatorId.toString() === userId;
      const myResult = isCreator ? d.creatorResult : d.opponentResult;
      const rivalResult = isCreator ? d.opponentResult : d.creatorResult;
      const session = mySessions.find((s) => s.duelId?.toString() === d._id.toString());
      const ended = ENDED.includes(d.status as DuelStatus);
      const pq = ended && detail ? await perQuestion(d) : null;
      const score = (
        r: typeof myResult,
        rows: DuelPlayerResult['perQuestion'],
      ): DuelPlayerResult | null =>
        r
          ? {
              correct: r.correct,
              totalTimeMs: r.totalTimeMs,
              ...(rows ? { perQuestion: rows } : {}),
            }
          : null;
      return {
        id: d._id.toString(),
        code: d.code,
        status: d.status as DuelStatus,
        role: isCreator ? 'CREATOR' : 'OPPONENT',
        me: player(userId)!,
        rival: player(isCreator ? d.opponentId : d.creatorId),
        myState: myResult ? 'FINISHED' : session ? 'PLAYING' : 'NOT_STARTED',
        rivalFinished: Boolean(rivalResult),
        sessionId: session?._id.toString() ?? null,
        createdAt: d.createdAt.toISOString(),
        expiresAt: d.expiresAt.toISOString(),
        result: ended
          ? {
              endReason: (d.endReason ?? 'EXPIRED') as NonNullable<DuelView['result']>['endReason'],
              winnerId: d.winnerId?.toString() ?? null,
              mine: score(myResult, pq ? (isCreator ? pq.creator : pq.opponent) : undefined),
              rivals: score(rivalResult, pq ? (isCreator ? pq.opponent : pq.creator) : undefined),
              winBonusXP: d.winBonusXP,
            }
          : null,
      } satisfies DuelView;
    }),
  );
}

/**
 * `POST /duels`. At most 5 live duels per creator (competition.md §2). The count and the insert
 * are two steps, so two simultaneous creates could make a sixth; that only weakens a spam guard,
 * so it is accepted (D-033). The code retries on the rare unique-index collision.
 */
export async function createDuel(userId: string): Promise<DuelView> {
  const open = await DuelModel.countDocuments({
    creatorId: userId,
    status: { $in: LIVE },
    expiresAt: { $gt: new Date() },
  });
  if (open >= DUEL.maxOpenPerUser)
    throw conflict(`You already have ${DUEL.maxOpenPerUser} open duels. Finish one first.`);

  const challenges = await pickDuelChallenges(await duelDifficulty(userId));
  const items = challenges.map((c) => ({
    challengeId: c._id,
    optionOrders: [shuffle(c.options.map((o) => o.id))],
  }));
  for (let i = 0; i < DUEL.codeRetries; i++) {
    try {
      const duel = await DuelModel.create({
        code: newCode(),
        creatorId: userId,
        items,
        expiresAt: new Date(Date.now() + DUEL.expiryMs),
      });
      return (await toViews(userId, [duel]))[0]!;
    } catch (err) {
      if (!isDuplicateKey(err)) throw err;
    }
  }
  throw new AppError('INTERNAL', 'Could not create a duel code, please try again');
}

/**
 * `POST /duels/join`. One atomic conditional update: only an OPEN, unexpired duel with no
 * opponent, created by someone else, can be joined, so two people racing for one code get
 * exactly one winner. The loser is told why.
 */
export async function joinDuel(userId: string, code: string): Promise<DuelView> {
  const joined = await DuelModel.findOneAndUpdate(
    {
      code,
      status: 'OPEN',
      opponentId: null,
      creatorId: { $ne: userId },
      expiresAt: { $gt: new Date() },
    },
    { $set: { opponentId: userId, status: 'ACTIVE' } },
    { returnDocument: 'after' },
  );
  if (joined) return (await toViews(userId, [joined]))[0]!;

  const duel = await DuelModel.findOne({ code });
  if (!duel) throw notFound('Duel');
  if (duel.creatorId.toString() === userId) throw conflict("You can't join your own duel");
  // A repeated tap on "Join" by the same person: return the duel they already joined.
  if (duel.opponentId?.toString() === userId) return (await toViews(userId, [duel]))[0]!;
  if (duel.opponentId) throw conflict('This duel is already taken');
  await settleDuel(duel);
  throw conflict('This duel has expired');
}

/** `POST /duels/:id/play`: starts (or resumes) the caller's DUEL session on the shared set. */
export async function playDuel(userId: string, duelId: string): Promise<SessionView> {
  const duel = await findOwnDuel(userId, duelId);
  const findMine = () => SessionModel.findOne({ duelId: duel._id, userId }).select('_id');
  const existing = await findMine();
  if (existing) return getSession(userId, existing._id.toString());
  if (ENDED.includes(duel.status as DuelStatus)) throw conflict('This duel has ended');

  // Lean read: Mongoose wraps nested arrays in documents; the session needs plain string[][].
  const { items } = (await DuelModel.findById(duel._id).select('items').lean())!;
  const challenges = await challengesRepo.findByIds(items.map((i) => i.challengeId));
  const byId = new Map(challenges.map((c) => [c._id.toString(), c]));
  const picked = items.flatMap((item) => {
    const challenge = byId.get(item.challengeId.toString());
    return challenge
      ? [{ challenge, isRevisit: false, optionOrders: item.optionOrders as unknown as string[][] }]
      : [];
  });
  const created = await createSession(userId, { type: 'DUEL', duelId, picked });
  if (created) return created;
  // A double tap on "Play" lost the unique-index race: return the session the other call made.
  const winner = await findMine();
  if (!winner) throw conflict('Could not start the duel, please try again');
  return getSession(userId, winner._id.toString());
}

export async function getDuel(userId: string, duelId: string): Promise<DuelView> {
  return (await toViews(userId, [await findOwnDuel(userId, duelId)], true))[0]!;
}

/**
 * `GET /duels`: the three tabs. Live duels are settled first, so one that just expired moves to
 * Finished in this same response. Both reads are bounded.
 */
export async function listDuels(userId: string): Promise<DuelListView> {
  const mine = { $or: [{ creatorId: userId }, { opponentId: userId }] };
  const live = await DuelModel.find({ ...mine, status: { $in: LIVE } })
    .sort({ createdAt: -1 })
    .limit(DUEL.activeListMax);
  const settled = await Promise.all(live.map(settleDuel));
  const stillLive = settled.filter((d) => LIVE.includes(d.status as DuelStatus));
  const finished = await DuelModel.find({ ...mine, status: { $in: ENDED } })
    .sort({ updatedAt: -1 })
    .limit(DUEL.finishedListSize);

  const views = await toViews(userId, [...stillLive, ...finished]);
  const live$ = views.filter((v) => v.result === null);
  return {
    yourTurn: live$.filter((v) => v.myState !== 'FINISHED'),
    waiting: live$.filter((v) => v.myState === 'FINISHED'),
    finished: views.filter((v) => v.result !== null),
  };
}
