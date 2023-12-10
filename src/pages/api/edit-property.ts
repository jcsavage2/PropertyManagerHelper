import { PropertyEntity } from '@/database/entities/property';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { EditProperty } from '@/types';
import { ApiError, ApiResponse } from './_types';
import { errorToResponse } from './_utils';
import * as Sentry from '@sentry/nextjs';
import { EditPropertySchema } from '@/types/customschemas';
import { UserEntity } from '@/database/entities/user';
import { createPropertyDisplayString } from '@/utils';
import { EventEntity } from '@/database/entities/event';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    if (!session) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: EditProperty = EditPropertySchema.parse(req.body);

    if (!body.propertyUUId) {
      throw new ApiError(API_STATUS.BAD_REQUEST, 'Property UUID is required');
    }

    const propertyEntity = new PropertyEntity();
    const eventEntity = new EventEntity();

    const existingProperties = await propertyEntity.getPropertiesByAddress({
      address: {
        address: body.address,
        city: body.city,
        state: body.state,
        country: body.country,
        postalCode: body.postalCode,
        unit: body.unit,
        numBeds: body.numBeds,
        numBaths: body.numBaths,
      },
      organization: body.organization,
    });

    if (existingProperties.length > 0) {
      throw new ApiError(API_STATUS.BAD_REQUEST, 'Property already exists', true);
    }

    const newProperty = await propertyEntity.editAddress({
      propertyUUId: body.propertyUUId,
      address: body.address,
      city: body.city,
      state: body.state,
      country: body.country,
      postalCode: body.postalCode,
      unit: body.unit,
      numBeds: body.numBeds,
      numBaths: body.numBaths,
      organization: body.organization,
      pmEmail: body.pmEmail,
    });

    await eventEntity.createPropertyEvent({
      propertyId: body.propertyUUId,
      madeByEmail: body.pmEmail,
      madeByName: body.pmName,
      message: `Address changed to: ${createPropertyDisplayString({
        address: body.address,
        city: body.city,
        state: body.state,
        postalCode: body.postalCode,
        unit: body.unit,
        numBaths: body.numBaths,
        numBeds: body.numBeds,
        country: body.country,
      })}`,
    });

    //Update each tenants record with new address changes
    const userEntity = new UserEntity();
    for (const email of newProperty?.tenantEmails || []) {
      await userEntity.editAddress({
        propertyUUId: body.propertyUUId,
        tenantEmail: email,
        address: body.address,
        city: body.city,
        country: body.country,
        postalCode: body.postalCode,
        state: body.state,
        unit: body.unit,
        numBeds: body.numBeds,
        numBaths: body.numBaths,
      });
    }
    return res.status(API_STATUS.SUCCESS).json({
      response: JSON.stringify({ property: newProperty }),
    });
  } catch (error: any) {
    console.log({ error });
    Sentry.captureException(error);
    return res.status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR).json(errorToResponse(error));
  }
}
