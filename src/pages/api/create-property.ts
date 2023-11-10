import { PropertyEntity } from '@/database/entities/property';
import { IUser, UserEntity, USER_TYPE } from '@/database/entities/user';
import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuid } from 'uuid';
import { options } from './auth/[...nextauth]';
import { getServerSession } from 'next-auth';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { CreatePropertySchema } from '@/types/customschemas';
import { CreateProperty } from '@/types';
import { ApiError, ApiResponse } from './_types';
import { errorToResponse } from './_utils';

/**
 *
 * @returns New property or error message on failure.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    //@ts-ignore
    const sessionUser: IUser = session?.user;

    //User must be a pm to create properties
    if (!session || !sessionUser?.roles?.includes(USER_TYPE.PROPERTY_MANAGER)) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: CreateProperty = CreatePropertySchema.parse(req.body);
    const {
      address,
      country,
      city,
      state,
      postalCode,
      unit,
      pmEmail,
      numBeds,
      numBaths,
      tenantEmail,
      organization,
    } = body;

    const propertyEntity = new PropertyEntity();
    const userEntity = new UserEntity();

    // Create Property
    const id = uuid();
    const newProperty = await propertyEntity.create({
      address,
      country,
      city,
      state,
      unit,
      postalCode,
      propertyManagerEmail: pmEmail,
      organization: organization,
      uuid: id,
      numBeds,
      numBaths,
      tenantEmail,
    });

    //Update tenant metadata with new property
    if (tenantEmail && tenantEmail.length) {
      await userEntity.addAddress({
        propertyUUId: id,
        tenantEmail,
        address,
        country,
        city,
        state,
        postalCode,
        numBeds,
        numBaths,
        unit,
      });
    }

    return res.status(API_STATUS.SUCCESS).json({ response: JSON.stringify(newProperty) });
  } catch (error: any) {
    console.log({ error });
    return res
      .status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR)
      .json(errorToResponse(error));
  }
}
