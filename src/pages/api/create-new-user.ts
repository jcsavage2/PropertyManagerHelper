import { ENTITIES } from "@/database/entities";
import { PropertyManagerEntity } from "@/database/entities/property-manager";
import { TenantEntity } from "@/database/entities/tenant";
import { DocumentClient, GetItemInput } from "aws-sdk/clients/dynamodb";
import { NextApiRequest, NextApiResponse } from "next";

type Data = {
  response: string;
};

type UserType = typeof ENTITIES[keyof typeof ENTITIES];

export type GetUser = {
  email: "string";
  userType: UserType;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as GetUser;
    const { email, userType } = body;



    switch (userType) {
      case ENTITIES.PROPERTY_MANAGER:
        const propertyManagerEntity = new PropertyManagerEntity();
        const existingPropertyManager = await propertyManagerEntity.get({ email, type: userType });
        console.log({ existingPropertyManager });
        //@ts-ignore
        const existingUserFromDB = existingPropertyManager?.Item ?? null;
        if (existingUserFromDB) {
          return res.status(200).json({ response: JSON.stringify(existingUserFromDB) });
        } else {
          const newPropertyManager = await propertyManagerEntity.create({ email, type: userType });
          //@ts-ignore
          return res.status(200).json({ response: JSON.stringify(newPropertyManager.Attributes) });
        }

      case ENTITIES.TENANT:
        const tenantEntity = new TenantEntity();
        const existingTenant = await tenantEntity.get({ email, type: userType });
        //@ts-ignore
        const existingTenantFromDB = existingTenant?.Item ?? null;
        console.log({ existingTenantFromDB });

        if (existingTenantFromDB) {
          return res.status(200).json({ response: JSON.stringify(existingTenantFromDB) });
        } else {
          const newPropertyManager = await tenantEntity.create({ email, type: userType });
          //@ts-ignore
          return res.status(200).json({ response: JSON.stringify(newPropertyManager.Attributes) });
        }
    }
  } catch (error) {
    console.log({ error });
  }
}