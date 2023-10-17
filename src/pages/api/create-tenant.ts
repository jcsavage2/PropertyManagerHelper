import { Data } from '@/database';
import { PropertyEntity } from '@/database/entities/property';
import { NextApiRequest, NextApiResponse } from 'next';
import sendgrid from '@sendgrid/mail';
import { IUser, UserEntity, userRoles } from '@/database/entities/user';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { getInviteTenantSendgridEmailBody } from '@/utils';
import { INVITE_STATUS } from '@/constants';

export type CreateTenantBody = {
  tenantEmail: string;
  tenantName: string;
  pmEmail: string;
  pmName: string;
  address: string;
  unit?: string;
  state: string;
  city: string;
  country: 'US' | 'CA';
  postalCode: string;
  numBeds: number;
  numBaths: number;
  createNewProperty: boolean;
  organization: string;
  organizationName: string;
  propertyUUId: string;
};

/**
 *
 * @returns `ContextUser` object.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const session = await getServerSession(req, res, options);
  // @ts-ignore
  const sessionUser: IUser = session?.user;

  //User must be a pm to create tenants
  if (!session || !sessionUser?.roles?.includes(userRoles.PROPERTY_MANAGER)) {
    res.status(401);
    return;
  }
  try {
    const body = req.body as CreateTenantBody;
    const {
      pmEmail,
      pmName,
      tenantEmail,
      tenantName,
      organization,
      organizationName,
      address,
      country = 'US',
      city,
      state,
      postalCode,
      unit,
      numBeds,
      numBaths,
      propertyUUId,
      createNewProperty,
    } = body;

    if (
      !pmName ||
      !pmEmail ||
      !tenantEmail ||
      !tenantName ||
      !address ||
      !city ||
      !state ||
      !postalCode ||
      !numBeds ||
      !numBaths ||
      !propertyUUId ||
      !organization ||
      !organizationName
    ) {
      throw new Error('create-tenant Error: Missing required fields.');
    }

    const userEntity = new UserEntity();
    const propertyEntity = new PropertyEntity();

    //If pm created tenant row exists, don't overwrite row
    const existingTenant = await userEntity.get({ email: tenantEmail });
    if (existingTenant && existingTenant.status !== INVITE_STATUS.CREATED) {
      return res.status(403).json({ response: "User Already Exists" });
    }

    // Create Tenant
    const newTenant = await userEntity.createTenant({
      tenantEmail,
      tenantName,
      pmEmail,
      pmName,
      propertyUUId,
      address,
      country,
      city,
      state,
      postalCode,
      unit,
      organization,
      organizationName,
      numBeds,
      numBaths,
    });

    // Create Property if necessary
    if (createNewProperty) {
      await propertyEntity.create({
        tenantEmail,
        propertyManagerEmail: pmEmail,
        organization,
        address,
        city,
        country,
        postalCode,
        state,
        unit,
        uuid: propertyUUId,
        numBeds,
        numBaths,
      });
    }

    /** SEND THE EMAIL TO THE USER */
    const apiKey = process.env.NEXT_PUBLIC_SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('missing SENDGRID_API_KEY env variable.');
    }
    sendgrid.setApiKey(apiKey);

    const authLink = `https://pillarhq.co/?authredirect=true`;
    const emailBody = getInviteTenantSendgridEmailBody(tenantName, authLink, pmName);
    await sendgrid.send({
      to: tenantEmail,
      from: 'pillar@pillarhq.co',
      subject: `${pmName} @ ${organizationName} is requesting you to join Pillar`,
      html: emailBody,
    });

    return res.status(200).json({ response: JSON.stringify(newTenant) });
  } catch (error: any) {
    console.log({ error });
    return res.status(error.statusCode || 500).json(error);
  }
}
