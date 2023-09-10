import { Data } from '@/database';
import { UserEntity } from '@/database/entities/user';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';

export type CreateTechnicianBody = {
  technicianEmail: string;
  technicianName: string;
  pmEmail: string;
  organization: string;
  organizationName: string;
};

/**
 *
 * @returns `ContextUser` object.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const session = await getServerSession(req, res, options);
  if (!session) {
    res.status(401);
    return;
  }
  try {
    const body = req.body as CreateTechnicianBody;
    const { technicianEmail, technicianName, organization, organizationName, pmEmail } = body;

    const userEntity = new UserEntity();

    const newTechnician = await userEntity.createTechnician({ technicianName, technicianEmail, organization, organizationName, pmEmail });

    return res.status(200).json({ response: JSON.stringify(newTechnician) });
  } catch (error) {
    console.log({ error });
  }
}
