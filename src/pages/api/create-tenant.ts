import { Data } from "@/database";
import { PropertyEntity } from "@/database/entities/property";
import { PropertyManagerEntity } from "@/database/entities/property-manager";
import { TenantEntity } from "@/database/entities/tenant";
import { NextApiRequest, NextApiResponse } from "next";



export type CreateTenantBody = {
  tenantEmail: string;
  tenantName: string;
  pmEmail: string;
  organization: string;
  address: string;
  unit: string;
  state: string;
  city: string;
  postalCode: string;
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
    const body = req.body as CreateTenantBody;
    const {
      organization,
      pmEmail,
      tenantEmail,
      tenantName,
    } = body;

    const propertyManagerEntity = new PropertyManagerEntity();
    const tenantEntity = new TenantEntity();
    const propertyEntity = new PropertyEntity();

    // Create companion row for the property manager.
    await propertyManagerEntity.createTenantCompanionRow({ tenantEmail, tenantName, organization, pmEmail });

    // CreateTenant
    const newTenant = await tenantEntity.create({ tenantEmail, tenantName, pmEmail });

    // Create Property

    //@ts-ignore
    return res.status(200).json({ response: JSON.stringify(newTenant.Attributes) });


  } catch (error) {
    console.log({ error });
  }
}