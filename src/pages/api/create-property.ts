import { Data } from '@/database';
import { PropertyEntity } from '@/database/entities/property';
import { UserEntity } from '@/database/entities/user';
import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuid } from 'uuid';
import { options } from './auth/[...nextauth]';
import { getServerSession } from 'next-auth';

export type CreatePropertyBody = {
  address: string;
  country: string;
  city: string;
  state: string;
  postalCode: string;
  unit?: string;
  pmEmail: string;
  organization: string;
  numBeds: number;
  numBaths: number;
  tenantEmail?: string;
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
    const body = req.body as CreatePropertyBody;
    const { address, country = 'US', city, state, postalCode, unit, pmEmail, numBeds, numBaths, tenantEmail, organization } = body;

    const propertyEntity = new PropertyEntity();
    const userEntity = new UserEntity();

    if (!pmEmail || !address || !city || !state || !postalCode || !numBeds || !numBaths || !organization) {
      throw new Error('create-property Error: Missing required fields.');
    }

    // Create Property
    const id = uuid();
    const newProperty = await propertyEntity.create({
      address,
      country,
      city,
      state,
      unit,
      postalCode,
      propertyManagerEmail: pmEmail,
      organization: organization,
      uuid: id,
      numBeds,
      numBaths,
      tenantEmail,
    });

    //Update tenant metadata with new property
    if (tenantEmail && tenantEmail.length) {
      await userEntity.addAddress({
        propertyUUId: id,
        tenantEmail,
        address,
        country,
        city,
        state,
        postalCode,
        numBeds,
        numBaths,
        unit,
      });
    }

    return res.status(200).json({ response: JSON.stringify(newProperty) });
  } catch (error: any) {
    console.log({ error });
    return res.status(500).json(error.statusCode || 500);
  }
}
