import { Data } from "@/database";
import { ENTITIES } from "@/database/entities";
import { PropertyManagerEntity } from "@/database/entities/property-manager";
import { TechnicianEntity } from "@/database/entities/technician";
import { TenantEntity } from "@/database/entities/tenant";
import { UserEntity } from "@/database/entities/user";
import { NextApiRequest, NextApiResponse } from "next";

type UserType = typeof ENTITIES[keyof typeof ENTITIES];

export type GetOrCreateUserBody = {
  email: string;
  userType: UserType;
  name: string;
};

/**
 * Attempts to get the user from the database. 
 * If the user does not exist in the database, the user is created.
 * Note, a user with the same email can have up to two profiles - one as a tenant and one as a property manager.
 * @returns `ContextUser` object.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as GetOrCreateUserBody;
    const { email, userType, name } = body;


    const userEntity = new UserEntity();
    //@ts-ignore
    const existingUser = await userEntity.get({ email })?.Item ?? null;
    if (existingUser) {
      return res.status(200).json({ response: JSON.stringify(existingUser) });
    } else {
      const newUser = await userEntity.createBaseUser({ email });
      if (newUser) {
        //@ts-ignore
        return res.status(200).json({ response: JSON.stringify(newUser?.Attributes) });
      }
    }

    // switch (userType) {
    //   case ENTITIES.PROPERTY_MANAGER:
    //     const propertyManagerEntity = new PropertyManagerEntity();
    //     const existingPropertyManager = await propertyManagerEntity.get({ email });
    //     //@ts-ignore
    //     const existingUserFromDB = existingPropertyManager?.Item ?? null;

    //     if (existingUserFromDB) {
    //       return res.status(200).json({ response: JSON.stringify(existingUserFromDB) });
    //     } else {
    //       const newPropertyManager = await propertyManagerEntity.create({ pmEmail: email, pmName: name });
    //       //@ts-ignore
    //       return res.status(200).json({ response: JSON.stringify(newPropertyManager.Attributes) });
    //     }

    //   case ENTITIES.TENANT:
    //     const tenantEntity = new TenantEntity();
    //     const existingTenant = await tenantEntity.get({ tenantEmail: email });
    //     //@ts-ignore
    //     const existingTenantFromDB = existingTenant?.Item ?? null;
    //     if (existingTenantFromDB) {
    //       await tenantEntity.update({ tenantEmail: email, status: "JOINED" });
    //       return res.status(200).json({ response: JSON.stringify(existingTenantFromDB) });
    //     } else {
    //       //@ts-ignore
    //       return res.status(200).json({ response: JSON.stringify(newTenant.Attributes) });
    //     }

    //   case ENTITIES.TECHNICIAN:
    //     const technicianEntity = new TechnicianEntity();
    //     const existingTechnician = await technicianEntity.get({ technicianEmail: email });
    //     const existingTechnicianFromDB = existingTechnician ?? null;
    //     if (existingTechnicianFromDB) {
    //       await technicianEntity.update({ technicianEmail: email, status: "JOINED" });
    //       return res.status(200).json({ response: JSON.stringify(existingTechnicianFromDB) });
    //     } else {
    //       return res.status(200).json({ response: JSON.stringify({}) });
    //     }
    // }
  } catch (error) {
    console.log({ error });
  }
}