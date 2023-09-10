import { Data } from '@/database';
import { StartKey } from '@/database/entities';
import { UserEntity } from '@/database/entities/user';
import { NextApiRequest, NextApiResponse } from 'next';

export type GetPMsForOrgRequest = {
  organization: string;
  startKey: StartKey;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    const { organization, startKey} = req.body as GetPMsForOrgRequest;
    const userEntity = new UserEntity();
    const response = await userEntity.getAllPMsForOrg({ organization, startKey });
    return res.status(200).json({ response: JSON.stringify({ pms: response.pms, startKey: response.startKey }) });
  } catch (error) {
    console.log({ error });
    return res.status(500).json({ response: '' });
  }
}
