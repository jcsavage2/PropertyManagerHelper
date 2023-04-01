import { ENTITIES } from "@/database/entities";
import { PropertyManagerEntity } from "@/database/entities/property-manager";
import { TenantEntity } from "@/database/entities/tenant";
import { NextApiRequest, NextApiResponse } from "next";

type Data = {
  response: string;
};

type UserType = typeof ENTITIES[keyof typeof ENTITIES];

export type GetUser = {
  email: string;
  userType: UserType;
  propertyManagerEmail?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as GetUser;
    const { email, userType, propertyManagerEmail } = body;


    const propertyManagerEntity = new PropertyManagerEntity();

    switch (userType) {
      case ENTITIES.PROPERTY_MANAGER:
        const existingPropertyManager = await propertyManagerEntity.get({ email });
        //@ts-ignore
        const existingUserFromDB = existingPropertyManager?.Item ?? null;

        if (existingUserFromDB) {
          return res.status(200).json({ response: JSON.stringify(existingUserFromDB) });
        } else {
          const newPropertyManager = await propertyManagerEntity.create({ email });
          //@ts-ignore
          return res.status(200).json({ response: JSON.stringify(newPropertyManager.Attributes) });
        }

      case ENTITIES.TENANT:
        const tenantEntity = new TenantEntity();
        const existingTenant = await tenantEntity.get({ email });
        //@ts-ignore
        const existingTenantFromDB = existingTenant?.Item ?? null;

        if (existingTenantFromDB) {
          return res.status(200).json({ response: JSON.stringify(existingTenantFromDB) });
        } else {
          const newTenant = await tenantEntity.create({ email });
          propertyManagerEmail && await propertyManagerEntity.update({ email: propertyManagerEmail, tenants: [email.toLocaleLowerCase()] });
          //@ts-ignore
          return res.status(200).json({ response: JSON.stringify(newTenant.Attributes) });
        }
    }
  } catch (error) {
    console.log({ error });
  }
}