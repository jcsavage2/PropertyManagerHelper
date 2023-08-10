import { Data } from "@/database";
import { TenantEntity } from "@/database/entities/tenant";
import { NextApiRequest, NextApiResponse } from "next";

type GetTenantByEmailApiProps = {
  tenantEmail: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as GetTenantByEmailApiProps;
    const tenantEntity = new TenantEntity();
    const tenant = await tenantEntity.get({ tenantEmail: body.tenantEmail });
    // @ts-ignore
    return res.status(200).json({ response: JSON.stringify(tenant && (tenant.Item ?? {})) });
  } catch (error) {
    console.log({ error });
  }
}