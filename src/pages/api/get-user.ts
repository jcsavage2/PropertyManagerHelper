import { Data } from '@/database';
import { ENTITIES } from '@/database/entities';
import { UserEntity } from '@/database/entities/user';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';

export type GetUser = {
  email: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const session = await getServerSession(req, res, options);
  if (!session) {
    res.status(401);
    return;
  }
  try {
    const body = req.body as GetUser;
    const { email } = body;
    const userEntity = new UserEntity();
    const user = await userEntity.get({ email });
    return res.status(200).json({ response: JSON.stringify(user) });
  } catch (error) { }
}
