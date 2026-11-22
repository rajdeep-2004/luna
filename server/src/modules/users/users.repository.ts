import { UserModel, type UserDoc } from '../../models/User';

export const usersRepo = {
  findById: (id: string) => UserModel.findById(id),
  findByEmailWithPassword: (email: string) => UserModel.findOne({ email }).select('+passwordHash'),
  create: (data: { email: string; username: string; passwordHash: string }) =>
    UserModel.create({ ...data, usernameLower: data.username.toLowerCase() }),
  update: (id: string, set: Record<string, unknown>): Promise<UserDoc | null> =>
    UserModel.findByIdAndUpdate(
      id,
      { $set: set },
      { returnDocument: 'after', runValidators: true },
    ),
  addXP: (id: string, amount: number) =>
    UserModel.updateOne({ _id: id }, { $inc: { totalXP: amount } }),
};
