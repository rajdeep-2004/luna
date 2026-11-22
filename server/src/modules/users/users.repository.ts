import { UserModel, type UserDoc } from '../../models/User';

export const usersRepo = {
  findById: (id: string) => UserModel.findById(id),
  /** Public fields only, for leaderboard rows and duel rivals. */
  findPlayers: (ids: (string | { toString(): string })[]) =>
    UserModel.find({ _id: { $in: ids } })
      .select('username avatarId totalXP')
      .lean(),
  findByEmailWithPassword: (email: string) =>
    UserModel.findOne({ email }).select('+passwordHash +failedLogins +lockedUntil'),
  create: (data: { email: string; username: string; passwordHash: string }) =>
    UserModel.create({ ...data, usernameLower: data.username.toLowerCase() }),
  update: (id: string, set: Record<string, unknown>): Promise<UserDoc | null> =>
    UserModel.findByIdAndUpdate(
      id,
      { $set: set },
      { returnDocument: 'after', runValidators: true },
    ),
  /** Atomic: counts a failure and locks the account once the threshold is reached. */
  recordFailedLogin: async (id: string, max: number, lockMs: number) => {
    const u = await UserModel.findByIdAndUpdate(
      id,
      { $inc: { failedLogins: 1 } },
      { returnDocument: 'after', projection: { failedLogins: 1 } },
    ).select('+failedLogins');
    if (u && (u.failedLogins ?? 0) >= max) {
      await UserModel.updateOne(
        { _id: id },
        { $set: { failedLogins: 0, lockedUntil: new Date(Date.now() + lockMs) } },
      );
    }
  },
  clearFailedLogins: (id: string) =>
    UserModel.updateOne({ _id: id }, { $set: { failedLogins: 0, lockedUntil: null } }),
  /** Compare-and-set: moves the streak only if `lastDailyDate` is still what the caller read. */
  setStreakIf: async (
    id: string,
    expectedLastDate: string | null,
    next: { current: number; longest: number; lastDate: string | null },
  ): Promise<boolean> => {
    const res = await UserModel.updateOne(
      { _id: id, lastDailyDate: expectedLastDate },
      {
        $set: {
          currentStreak: next.current,
          longestStreak: next.longest,
          lastDailyDate: next.lastDate,
        },
      },
    );
    return res.modifiedCount === 1;
  },
  addXP: (id: string, amount: number) =>
    UserModel.updateOne({ _id: id }, { $inc: { totalXP: amount } }),
};
