import { Data } from '@/database';
import { StartKey } from '@/database/entities';
import { UserEntity } from '@/database/entities/user';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';

export type GetTechsForOrgRequest = {
  organization: string;
  startKey: StartKey;
  techSearchString?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const session = await getServerSession(req, res, options);
  if (!session) {
    res.status(401);
    return;
  }
  try {
    const { organization, startKey, techSearchString } = req.body as GetTechsForOrgRequest;
    const userEntity = new UserEntity();
    const response = await userEntity.getAllTechniciansForOrg({ organization, startKey, techSearchString });
    return res.status(200).json({ response: JSON.stringify({ techs: response.techs, startKey: response.startKey }) });
  } catch (error) {
    console.log({ error });
    return res.status(500).json({ response: '' });
  }
}
