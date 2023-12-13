import { PropertyEntity } from '@/database/entities/property';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { AddRemoveTenantToProperty } from '@/types';
import { ApiError, ApiResponse } from './_types';
import { errorToResponse } from './_utils';
import * as Sentry from '@sentry/nextjs';
import { AddRemoveTenantToPropertySchema } from '@/types/customschemas';
import { UserEntity } from '@/database/entities/user';
import { EventEntity } from '@/database/entities/event';
import { toTitleCase } from '@/utils';

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

    //Update tenants at property
    const updatedProperty = await propertyEntity.addRemoveTenant({
      propertyUUId: body.propertyUUId,
      tenantEmail: body.tenantEmail,
      remove: body.remove,
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
        address: updatedProperty.address!,
        city: updatedProperty.city!,
        country: updatedProperty.country!,
        postalCode: updatedProperty.postalCode!,
        state: updatedProperty.state!,
        unit: updatedProperty.unit,
        numBeds: updatedProperty.numBeds!,
        numBaths: updatedProperty.numBaths!,
      });
    }

    await eventEntity.createPropertyEvent({
      propertyId: body.propertyUUId,
      madeByEmail: body.pmEmail,
      madeByName: body.pmName,
      message: body.remove ? `Tenant removed: ${toTitleCase(body.tenantName)}` : `Tenant added: ${toTitleCase(body.tenantName)}`,
    });

    return res.status(API_STATUS.SUCCESS).json({
      response: JSON.stringify({ property: updatedProperty }),
    });
  } catch (error: any) {
    console.log({ error });
    Sentry.captureException(error);
    return res.status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR).json(errorToResponse(error));
  }
}
