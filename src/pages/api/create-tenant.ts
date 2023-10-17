import { Data } from '@/database';
import { PropertyEntity } from '@/database/entities/property';
import { NextApiRequest, NextApiResponse } from 'next';
import sendgrid from '@sendgrid/mail';
import { IUser, UserEntity, userRoles } from '@/database/entities/user';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { getInviteTenantSendgridEmailBody } from '@/utils';
import { CreateTenantSchema } from '@/components/add-tenant-modal';
import { INVALID_PARAM_ERROR } from '@/constants';

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
    const body = CreateTenantSchema.parse(req.body);
    const { pmEmail, pmName, tenantEmail, tenantName, organization, organizationName, property, createNewProperty } = body;

    if (!property) {
      throw new Error(INVALID_PARAM_ERROR('property'));
    }

    const userEntity = new UserEntity();
    const propertyEntity = new PropertyEntity();

    const existingTenant = await userEntity.get({ email: tenantEmail });
    if (existingTenant) {
      return res.status(403).json({ response: "User Already Exists" });
    }

    // Create Tenant
    const newTenant = await userEntity.createTenant({
      tenantEmail,
      tenantName,
      pmEmail,
      pmName,
      propertyUUId: property.propertyUUId,
      address: property.address,
      country: property.country,
      city: property.city,
      state: property.state,
      postalCode: property.postalCode,
      unit: property.unit,
      numBeds: property.numBeds,
      numBaths: property.numBaths,
      organization,
      organizationName,
    });

    // Create Property if necessary
    if (createNewProperty) {
      await propertyEntity.create({
        tenantEmail,
        propertyManagerEmail: pmEmail,
        organization,
        uuid: property.propertyUUId,
        address: property.address,
        country: property.country,
        city: property.city,
        state: property.state,
        postalCode: property.postalCode,
        unit: property.unit,
        numBeds: property.numBeds,
        numBaths: property.numBaths,
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
