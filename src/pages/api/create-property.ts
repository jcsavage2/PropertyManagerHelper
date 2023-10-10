import { Data } from '@/database';
import { PropertyEntity } from '@/database/entities/property';
import { IUser, UserEntity, userRoles } from '@/database/entities/user';
import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuid } from 'uuid';
import { options } from './auth/[...nextauth]';
import { getServerSession } from 'next-auth';
import { CreatevalidateProperty } from '@/components/add-property-modal';

/**
 *
 * @returns New property or error message on failure.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const session = await getServerSession(req, res, options);
  //@ts-ignore
  const sessionUser: IUser = session?.user;
  
  //User must be a pm to create properties
  if (!session || !sessionUser?.roles?.includes(userRoles.PROPERTY_MANAGER)) {
    res.status(401);
    return;
  }
  try {
    const body = CreatevalidateProperty.parse(req.body);
    const { address, country = 'US', city, state, postalCode, unit, pmEmail, numBeds, numBaths, tenantEmail, organization } = body;

    const propertyEntity = new PropertyEntity();
    const userEntity = new UserEntity();

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
    return res.status(500).json({ response: error?.message });
  }
}
