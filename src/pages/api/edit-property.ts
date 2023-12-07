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
import { ENTITY_KEY } from '@/database/entities';
import { createPropertyDisplayString, generateKey } from '@/utils';
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

    //We have to delete and recreate because sks are different now
    const propertyEntity = new PropertyEntity();
    const eventEntity = new EventEntity();

    //Delete the old address
    await propertyEntity.delete({ pk: generateKey(ENTITY_KEY.PROPERTY, body.propertyUUId), sk: body.oldSk });

    //Create the new address
    const newProperty = await propertyEntity.create({
      address: body.address,
      city: body.city,
      country: body.country,
      postalCode: body.postalCode,
      state: body.state,
      organization: body.organization,
      propertyManagerEmail: body.pmEmail,
      tenantEmails: body.tenantEmails,
      unit: body.unit,
      uuid: body.propertyUUId,
      numBeds: body.numBeds,
      numBaths: body.numBaths,
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
      })}}`,
    });

    //Update each tenants record with new address changes
    const userEntity = new UserEntity();
    for (const email of body.tenantEmails) {
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
