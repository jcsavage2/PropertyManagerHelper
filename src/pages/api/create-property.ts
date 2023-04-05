import { Data } from "@/database";
import { PropertyEntity } from "@/database/entities/property";
import { PropertyManagerEntity } from "@/database/entities/property-manager";
import { NextApiRequest, NextApiResponse } from "next";



export type CreatePropertyBody = {
  streetAddress: string;
  country: string;
  city: string;
  state: string;
  zip: string;
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
    const { streetAddress, country, city, state, zip, unitNumber, propertyManagerEmail } = body;

    const propertyManagerEntity = new PropertyManagerEntity();
    const propertyEntity = new PropertyEntity();

    // Create Property
    const newProperty = await propertyEntity.create({ streetAddress, country, city, state, zip, unitNumber, propertyManagerEmail });
    await propertyManagerEntity.createPropertyCompanionRow({ email: propertyManagerEmail, organization: "", addressPk: newProperty.pk, addressSk: newProperty.sk });

    //@ts-ignore
    return res.status(200).json({ response: JSON.stringify(newTenant.Attributes) });


  } catch (error) {
    console.log({ error });
  }
}