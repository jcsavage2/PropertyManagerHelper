import { Data } from '@/database';
import { PropertyEntity } from '@/database/entities/property';
import { PropertyManagerEntity } from '@/database/entities/property-manager';
import { UserEntity } from '@/database/entities/user';
import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuid } from 'uuid';

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
  try {
    const body = req.body as CreatePropertyBody;
    const { address, country = 'US', city, state, postalCode, unit, pmEmail, numBeds, numBaths, tenantEmail, organization } = body;

    const propertyManagerEntity = new PropertyManagerEntity();
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

    //Assign pm to new property
    if (newProperty) {
      await propertyManagerEntity.createPropertyCompanionRow({
        email: pmEmail,
        organization: organization,
        addressPk: newProperty.pk,
        addressSk: newProperty.sk,
      });
    }

    return res.status(200).json({ response: JSON.stringify(newProperty) });
  } catch (error: any) {
    console.log({ error });
    return res.status(500).json(error.statusCode || 500);
  }
}
