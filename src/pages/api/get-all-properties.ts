import { Data } from '@/database';
import { StartKey } from '@/database/entities';
import { PropertyEntity } from '@/database/entities/property';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';

export type GetPropertiesApiRequest = {
  startKey: StartKey | undefined;
  pmEmail?: string;
  orgId?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const session = await getServerSession(req, res, options);
  if (!session) {
    res.status(401);
    return;
  }
  try {
    const body = req.body as GetPropertiesApiRequest;
    let response;
    if (body.pmEmail && body.orgId) {
      throw new Error('get-properties-for-property-manager Error: Attempting to get properties with org AND pm info');
    }
    const propertyEntity = new PropertyEntity();

    if (body.pmEmail) {
      response = await propertyEntity.getAllForPropertyManager({ pmEmail: body.pmEmail, startKey: body.startKey });
    } else {
      response = await propertyEntity.getByOrganization({ organization: body.orgId!, startKey: body.startKey });
    }

    return res.status(200).json({ response: JSON.stringify({ properties: response.properties, startKey: response.startKey }) });
  } catch (error) {
    console.log({ error });
    return res.status(500).json({ response: JSON.stringify({ error }) });
  }
}
