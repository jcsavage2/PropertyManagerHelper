import { Data } from '@/database';
import { StartKey } from '@/database/entities';
import { UserEntity } from '@/database/entities/user';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';

export type GetTenantsForOrgRequest = {
  organization: string;
  startKey: StartKey;
  statusFilter?: Record<'JOINED' | 'INVITED', boolean>;
  tenantSearchString?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const session = await getServerSession(req, res, options);
  if (!session) {
    res.status(401);
    return;
  }
  try {
    const { organization, startKey, tenantSearchString, statusFilter } = req.body as GetTenantsForOrgRequest;
    if (!organization || !statusFilter) {
      throw new Error('Missing required fields');
    }
    const userEntity = new UserEntity();
    const response = await userEntity.getAllTenantsForOrg({ organization, startKey, statusFilter, tenantSearchString });
    return res.status(200).json({ response: JSON.stringify({ tenants: response.tenants, startKey: response.startKey }) });
  } catch (error) {
    console.log({ error });
    return res.status(500).json({ response: '' });
  }
}
