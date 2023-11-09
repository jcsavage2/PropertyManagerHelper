import { ENTITIES } from '@/database/entities';
import { EventEntity } from '@/database/entities/event';
import { OrganizationEntity } from '@/database/entities/organization';
import { PropertyEntity } from '@/database/entities/property';
import { IUser, UserEntity, USER_TYPE } from '@/database/entities/user';
import { WorkOrderEntity } from '@/database/entities/work-order';
import { deconstructKey } from '@/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { API_STATUS, USER_PERMISSION_ERROR, WO_STATUS } from '@/constants';
import { DeleteEntitySchema } from '@/types/customschemas';
import { DeleteEntity } from '@/types';
import { ApiError, ApiResponse } from './_types';
import { errorToResponse } from './_utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    //@ts-ignore
    const sessionUser: IUser = session?.user;

    //Tenants and technicians should not be allowed to delete entities
    if (!session || !sessionUser?.roles?.includes(USER_TYPE.PROPERTY_MANAGER)) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: DeleteEntity = DeleteEntitySchema.parse(req.body);
    const { pk, sk, entity, roleToDelete, currentUserRoles, madeByEmail, madeByName } = body;

    if (
      (entity === ENTITIES.USER && !roleToDelete) ||
      (entity !== ENTITIES.USER && roleToDelete) ||
      !madeByEmail ||
      !madeByName
    ) {
      throw new ApiError(
        API_STATUS.BAD_REQUEST,
        'Invalid params to delete, when trying to delete a user, you must specify the role to delete'
      );
    }

    let dbEntity: WorkOrderEntity | PropertyEntity | EventEntity | OrganizationEntity | UserEntity;
    let deleteEntireEntity = true;
    switch (entity) {
      case ENTITIES.WORK_ORDER:
        dbEntity = new WorkOrderEntity();

        //Cannot delete work orders that are already deleted
        const workOrder = await dbEntity.get({ pk, sk });
        if (workOrder && workOrder.status === WO_STATUS.DELETED) {
          throw new ApiError(API_STATUS.BAD_REQUEST, 'Work order has already been deleted', true);
        }

        //When work orders are deleted spawn an event
        const eventEntity = new EventEntity();
        await eventEntity.create({
          workOrderId: deconstructKey(pk),
          message: `Work Order Deleted`,
          madeByEmail,
          madeByName,
        });
        break;
      case ENTITIES.PROPERTY:
        dbEntity = new PropertyEntity();
        break;
      case ENTITIES.EVENT:
        dbEntity = new EventEntity();
        break;
      case ENTITIES.ORGANIZATION:
        dbEntity = new OrganizationEntity();
        break;
      case ENTITIES.USER:
        dbEntity = new UserEntity();
        if (!currentUserRoles || !currentUserRoles.length) {
          throw new ApiError(
            API_STATUS.INTERNAL_SERVER_ERROR,
            "User doesn't have any roles to delete"
          );
        }

        //If user has more than one role, then we only want to delete the role instead of their entire user record
        if (currentUserRoles.length > 1) {
          deleteEntireEntity = false;
        }
        break;
      default:
        throw new ApiError(API_STATUS.BAD_REQUEST, 'Invalid entity type');
    }

    if (deleteEntireEntity) {
      await dbEntity.delete({ pk, sk });
    } else {
      if (!roleToDelete || entity !== ENTITIES.USER) {
        throw new ApiError(
          API_STATUS.BAD_REQUEST,
          "Can't delete user record unless the entity to delete is a user"
        );
      }
      //@ts-ignore
      await dbEntity.deleteRole({ pk, sk, roleToDelete, existingRoles: currentUserRoles });
    }

    return res.status(API_STATUS.SUCCESS).json({ response: 'Successfully deleted entity' });
  } catch (error: any) {
    console.log({ error });
    return res
      .status(error?.status || API_STATUS.INTERNAL_SERVER_ERROR)
      .json(errorToResponse(error));
  }
}
