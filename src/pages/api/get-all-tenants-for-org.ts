import { Data } from '@/database';
import { StartKey } from '@/database/entities';
import { UserEntity } from '@/database/entities/user';
import { NextApiRequest, NextApiResponse } from 'next';

export type GetTenantsForOrgRequest = {
  organization: string;
  startKey: StartKey;
  tenantSearchString?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    const { organization, startKey, tenantSearchString } = req.body as GetTenantsForOrgRequest;
    const userEntity = new UserEntity();
    const response = await userEntity.getAllTenantsForOrg({ organization, startKey, tenantSearchString });
    return res.status(200).json({ response: JSON.stringify({ tenants: response.tenants, startKey: response.startKey }) });
  } catch (error) {
    console.log({ error });
    return res.status(500).json({ response: '' });
  }
}
