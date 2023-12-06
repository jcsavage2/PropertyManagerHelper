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
import { ENTITIES, ENTITY_KEY, createAddressString, generateAddressSk } from '@/database/entities';
import { createPropertyDisplayString, generateKey } from '@/utils';
import { EventEntity } from '@/database/entities/event';

//TODO: what to do about work order addresses
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
      message: `Address updated to: 
        ${createPropertyDisplayString({
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
    for (const email of body.tenantEmails) {
      const tenant = await userEntity.get({ email });
      console.log('Updating address for tenant: ' + tenant);

      if (!tenant) {
        throw new ApiError(API_STATUS.BAD_REQUEST, 'Error updating address for tenant: ' + email);
      }

      let addressesMap = tenant?.addresses;
      addressesMap[body.propertyUUId!] = {
        address: body.address,
        city: body.city,
        state: body.state,
        postalCode: body.postalCode,
        unit: body.unit,
        country: body.country,
        isPrimary: addressesMap[body.propertyUUId!]?.isPrimary ?? false,
        numBeds: body.numBeds,
        numBaths: body.numBaths,
      };

      //Have to recreate address string from scratch
      let newAddressString: string = '';
      let GSI4SK: string = '';
      Object.keys(addressesMap).forEach((key: string) => {
        const property = addressesMap[key];
        newAddressString += createAddressString({
          address: property.address,
          city: property.city,
          state: property.state,
          postalCode: property.postalCode,
          unit: property.unit,
        });

        if (property.isPrimary) {
          GSI4SK =
            generateAddressSk({
              entityKey: ENTITY_KEY.TENANT,
              address: property.address,
              city: property.city,
              country: property.country,
              state: property.state,
              postalCode: property.postalCode,
              unit: property.unit,
            }) +
            '#' +
            email;
        }
      });

      await userEntity.updateUser({
        pk: generateKey(ENTITY_KEY.USER, email),
        sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER),
        addresses: addressesMap,
        addressString: newAddressString,
        GSI4SK,
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
