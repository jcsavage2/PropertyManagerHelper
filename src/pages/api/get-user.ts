import { Data } from "@/database";
import { ENTITIES } from "@/database/entities";
import { PropertyManagerEntity } from "@/database/entities/property-manager";
import { TenantEntity } from "@/database/entities/tenant";
import { NextApiRequest, NextApiResponse } from "next";

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
    let user;
    switch (userType) {
      case ENTITIES.PROPERTY_MANAGER:
        const propertyManagerEntity = new PropertyManagerEntity();
        user = await propertyManagerEntity.get({ email });
        return res.status(200).json({ response: JSON.stringify(user) });
      case ENTITIES.TENANT:
        const tenantEntity = new TenantEntity();
        user = await tenantEntity.get({ email });
        return res.status(200).json({ response: JSON.stringify({ user }) });
    }

  } catch (error) {

  }
}