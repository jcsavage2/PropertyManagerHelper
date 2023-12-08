import { IProperty, PropertyEntity } from '@/database/entities/property';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { AddRemoveTenantToProperty, EditProperty } from '@/types';
import { ApiError, ApiResponse } from './_types';
import { errorToResponse } from './_utils';
import * as Sentry from '@sentry/nextjs';
import { AddRemoveTenantToPropertySchema, EditPropertySchema } from '@/types/customschemas';
import { UserEntity } from '@/database/entities/user';
import { ENTITY_KEY } from '@/database/entities';
import { createPropertyDisplayString, generateKey } from '@/utils';
import { EventEntity } from '@/database/entities/event';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    if (!session) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: AddRemoveTenantToProperty = AddRemoveTenantToPropertySchema.parse(req.body);

    const propertyEntity = new PropertyEntity();
    const eventEntity = new EventEntity();
    const userEntity = new UserEntity();

    const oldProperty = await propertyEntity.getById({ uuid: body.propertyUUId });
    if (!oldProperty) {
      throw new ApiError(API_STATUS.BAD_REQUEST, 'Property does not exist');
    }

    let newTenantEmails: string[] = oldProperty?.tenantEmails ?? [];

    if (body.remove) {
      newTenantEmails = newTenantEmails.filter((email) => email !== body.tenantEmail);
    } else {
      if (newTenantEmails.includes(body.tenantEmail)) {
        throw new ApiError(API_STATUS.BAD_REQUEST, 'Tenant already added to property', true);
      }

      newTenantEmails.push(body.tenantEmail);
    }

    //Update tenants at property
    await propertyEntity.updateTenantEmails({
      pk: oldProperty.pk,
      sk: oldProperty.sk,
      newTenantEmails,
    });

    //Add/remove property from tenant
    if (body.remove) {
      await userEntity.removeAddress({
        tenantEmail: body.tenantEmail,
        propertyUUId: body.propertyUUId,
      });
    } else {
      await userEntity.addAddress({
        tenantEmail: body.tenantEmail,
        propertyUUId: body.propertyUUId,
        address: oldProperty.address!,
        city: oldProperty.city!,
        country: oldProperty.country!,
        postalCode: oldProperty.postalCode!,
        state: oldProperty.state!,
        unit: oldProperty.unit,
        numBeds: oldProperty.numBeds!,
        numBaths: oldProperty.numBaths!,
      });
    }

    await eventEntity.createPropertyEvent({
      propertyId: body.propertyUUId,
      madeByEmail: body.pmEmail,
      madeByName: body.pmName,
      message: body.remove ? `Tenant removed: ${body.tenantEmail}` : `Tenant added: ${body.tenantEmail}`,
    });

    const updatedProperty = { ...oldProperty, tenantEmails: newTenantEmails };
    return res.status(API_STATUS.SUCCESS).json({
      response: JSON.stringify({ property: updatedProperty }),
    });
  } catch (error: any) {
    console.log({ error });
    Sentry.captureException(error);
    return res.status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR).json(errorToResponse(error));
  }
}
