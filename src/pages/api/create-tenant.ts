import { PropertyEntity } from '@/database/entities/property';
import { NextApiRequest, NextApiResponse } from 'next';
import sendgrid from '@sendgrid/mail';
import { IUser, UserEntity, USER_TYPE } from '@/database/entities/user';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { getInviteTenantSendgridEmailBody, toTitleCase } from '@/utils';
import { API_STATUS, INVITE_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { CreateTenantSchema } from '@/types/customschemas';
import { ApiError, ApiResponse } from './_types';
import { INVALID_PARAM_ERROR, errorToResponse, initializeSendgrid } from './_utils';
import { CreateTenant } from '@/types';

/**
 *
 * @returns `ContextUser` object.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    // @ts-ignore
    const sessionUser: IUser = session?.user;

    //User must be a pm to create tenants
    if (!session || !sessionUser?.roles?.includes(USER_TYPE.PROPERTY_MANAGER)) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: CreateTenant = CreateTenantSchema.parse(req.body);
    const {
      pmEmail,
      pmName,
      tenantEmail,
      tenantName,
      organization,
      organizationName,
      property,
      createNewProperty,
    } = body;

    if (!property) {
      throw new ApiError(API_STATUS.BAD_REQUEST, INVALID_PARAM_ERROR('property'));
    }

    const userEntity = new UserEntity();
    const propertyEntity = new PropertyEntity();

    //Don't overwrite existing tenant
    const existingTenant = await userEntity.get({ email: tenantEmail });
    if (existingTenant && existingTenant.status !== INVITE_STATUS.CREATED) {
      throw new ApiError(API_STATUS.FORBIDDEN, 'User already exists.', true);
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
    initializeSendgrid(sendgrid, process.env.NEXT_PUBLIC_SENDGRID_API_KEY);

    const authLink = `https://pillarhq.co/?authredirect=true`;
    const emailBody = getInviteTenantSendgridEmailBody(tenantName, authLink, pmName);
    await sendgrid.send({
      to: tenantEmail,
      from: 'pillar@pillarhq.co',
      subject: `${toTitleCase(pmName)} @ ${toTitleCase(
        organizationName
      )} is requesting you to join Pillar`,
      html: emailBody,
    });

    return res.status(API_STATUS.SUCCESS).json({ response: JSON.stringify(newTenant) });
  } catch (error: any) {
    console.log({ error });
    return res
      .status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR)
      .json(errorToResponse(error));
  }
}
