import { Data } from '@/database';
import { UserEntity } from '@/database/entities/user';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';

export type CreateTechnicianBody = {
  technicianEmail: string;
  technicianName: string;
  pmEmail: string;
  pmName: string;
  organization: string;
  organizationName: string;
};

/**
 *
 * @returns `ContextUser` object.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const session = await getServerSession(req, res, options);
  //User must be a pm to create technicians
  // @ts-ignore
  if (!session || !user?.roles?.includes(userRoles.PROPERTY_MANAGER)) {
    res.status(401);
    return;
  }
  try {
    const body = req.body as CreateTechnicianBody;
    const { technicianEmail, technicianName, organization, organizationName, pmEmail, pmName } = body;

    const userEntity = new UserEntity();

    const newTechnician = await userEntity.createTechnician({ technicianName, technicianEmail, organization, organizationName, pmEmail, pmName });

    return res.status(200).json({ response: JSON.stringify(newTechnician) });
  } catch (error) {
    console.log({ error });
  }
}
