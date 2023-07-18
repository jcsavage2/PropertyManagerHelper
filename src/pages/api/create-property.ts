import { Data } from "@/database";
import { PropertyEntity } from "@/database/entities/property";
import { PropertyManagerEntity } from "@/database/entities/property-manager";
import { NextApiRequest, NextApiResponse } from "next";
import { uuid as uuidv4 } from "uuidv4";



export type CreatePropertyBody = {
  streetAddress: string;
  country: string;
  city: string;
  state: string;
  postalCode: string;
  unitNumber?: string;
  propertyManagerEmail: string;
};

/**
 * 
 * @returns `ContextUser` object.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as CreatePropertyBody;
    const { streetAddress, country, city, state, postalCode, unitNumber, propertyManagerEmail } = body;

    const propertyManagerEntity = new PropertyManagerEntity();
    const propertyEntity = new PropertyEntity();

    // Create Property
    const uuid = uuidv4();
    const newProperty = await propertyEntity.create({ address: streetAddress, country, city, state, unit: unitNumber, postalCode, propertyManagerEmail, uuid });
    await propertyManagerEntity.createPropertyCompanionRow({ email: propertyManagerEmail, organization: "", addressPk: newProperty.pk, addressSk: newProperty.sk });

    return res.status(200).json({ response: JSON.stringify(newProperty) });
  } catch (error) {
    console.log({ error });
  }
}