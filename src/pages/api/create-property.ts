import { Data } from "@/database";
import { PropertyEntity } from "@/database/entities/property";
import { PropertyManagerEntity } from "@/database/entities/property-manager";
import { UserEntity } from "@/database/entities/user";
import { NextApiRequest, NextApiResponse } from "next";
import { uuid as uuidv4 } from "uuidv4";

export type CreatePropertyBody = {
  address: string;
  country: string;
  city: string;
  state: string;
  postalCode: string;
  unit?: string;
  pmEmail: string;
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
    const { address, country = "US", city, state, postalCode, unit, pmEmail, numBeds, numBaths, tenantEmail } = body;

    const propertyManagerEntity = new PropertyManagerEntity();
    const propertyEntity = new PropertyEntity();
    const userEntity = new UserEntity();

    if(!pmEmail || !address || !city || !state || !postalCode || !numBeds || !numBaths) {
      throw new Error("create-property Error: Missing required fields.");
    }

    // Create Property
    const uuid = uuidv4();
    const newProperty = await propertyEntity.create({
      address,
      country,
      city,
      state,
      unit,
      postalCode,
      propertyManagerEmail: pmEmail,
      uuid,
      numBeds,
      numBaths,
      tenantEmail,
    });

    //Update tenant metadata with new property
    if(tenantEmail && tenantEmail.length) {
      await userEntity.addAddress({
        propertyUUId: uuid,
        tenantEmail,
        address,
        country,
        city,
        state,
        postalCode,
        numBeds,
        numBaths,
        unit,
      })
    }

    await propertyManagerEntity.createPropertyCompanionRow({
      email: pmEmail,
      organization: "",
      addressPk: newProperty.pk,
      addressSk: newProperty.sk,
    });

    return res.status(200).json({ response: JSON.stringify(newProperty) });
  } catch (error: any) {
    console.log({ error });
    return res.status(500).json(error.statusCode || 500);
  }
}
