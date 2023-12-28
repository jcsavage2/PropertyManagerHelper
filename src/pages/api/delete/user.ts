import { PropertyEntity } from '@/database/entities/property';
import { IUser, UserEntity, USER_TYPE } from '@/database/entities/user';
import { deconstructKey } from '@/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import * as Sentry from '@sentry/nextjs';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { ApiError, ApiResponse } from '../_types';
import { options } from '../auth/[...nextauth]';
import { DeleteUserSchema } from '@/types/customschemas';
import { DeleteUserBody } from '@/types';
import { errorToResponse } from '../_utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    //@ts-ignore
    const sessionUser: IUser = session?.user;

    //Tenants and technicians should not be allowed to delete entities
    if (!session || !sessionUser?.roles?.includes(USER_TYPE.PROPERTY_MANAGER)) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: DeleteUserBody = DeleteUserSchema.parse(req.body);
    const { pk, sk, roleToDelete, madeByEmail, madeByName } = body;

    const userEntity = new UserEntity();
    const propertyEntity = new PropertyEntity();

    //Remove the tenant from their properties
    if (roleToDelete === USER_TYPE.TENANT) {
      const tenant = await userEntity.get({ email: deconstructKey(pk) });

      if (tenant && tenant.addresses) {
        let promises = [];
        for (const propertyUUId of Object.keys(tenant.addresses)) {
          //If somehow the user got into a state where the property on their record doesn't exist, then skip it
          const propertyExists = await propertyEntity.getById({ uuid: propertyUUId });
          if (!propertyExists) {
            continue;
          }

          promises.push(
            propertyEntity.addRemoveTenant({
              propertyUUId,
              tenantEmail: tenant.email,
              remove: true,
            })
          );
        }

        await Promise.all(promises);
      }
    }

    await userEntity.delete({ pk, sk });

    return res.status(API_STATUS.SUCCESS).json({ response: 'Successfully deleted entity' });
  } catch (error: any) {
    console.log({ error });
    Sentry.captureException(error);
    return res.status(error?.status || API_STATUS.INTERNAL_SERVER_ERROR).json(errorToResponse(error));
  }
}
