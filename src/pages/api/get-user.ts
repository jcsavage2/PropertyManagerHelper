import { ENTITIES } from "@/database/entities";
import { PropertyManagerEntity } from "@/database/entities/property-manager";
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
    console.log({ email, userType });
    switch (userType) {
      case ENTITIES.PROPERTY_MANAGER:
        const propertyManagerEntity = new PropertyManagerEntity();
        const user = await propertyManagerEntity.get({ email });
        return res.status(200).json({ response: JSON.stringify(user) });
      case ENTITIES.TENANT:
        // const tenantEntity = new TenantEntity();
        // const user = await tenantEntity.get({ email });
        return res.status(200).json({ response: JSON.stringify({}) });
    }

  } catch (error) {

  }
}