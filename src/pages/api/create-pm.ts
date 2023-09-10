import { Data } from '@/database';
import { ICreatePMUser, UserEntity } from '@/database/entities/user';
import { NextApiRequest, NextApiResponse } from 'next';

export type CreatePMBody = {
  pmName: string;
  isAdmin: boolean;
  pmEmail: string;
  organization: string;
  organizationName: string;
};

/**
 *
 * @returns `ContextUser` object.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    const body = req.body as ICreatePMUser;
    const { organization, organizationName, userEmail, userName, isAdmin } = body;

    const userEntity = new UserEntity();
    const newPM = await userEntity.createPropertyManager({ organization, organizationName, userEmail, userName, isAdmin });

    return res.status(200).json({ response: JSON.stringify(newPM) });
  } catch (error) {
    console.log({ error });
  }
}
