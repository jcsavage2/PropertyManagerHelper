import { useUserContext } from '@/context/user';
import { IUser, USER_TYPE } from '@/database/entities/user';

/**
 * @returns boolean, true if the current user is a tenant user.
 */
export function useUserIsTenant(user: IUser): user is IUser {
  const { userType } = useUserContext();
  return userType === USER_TYPE.TENANT;
}
/**
 * @returns boolean, true if the current user is a PropertyManager.
 */
export function useUserIsPropertyManager(user: IUser): user is IUser {
  const { userType } = useUserContext();
  return userType === USER_TYPE.PROPERTY_MANAGER;
}
/**
 * @returns boolean, true if the current user is a Technician.
 */
export function useUserIsTechnician(user: IUser): user is IUser {
  const { userType } = useUserContext();
  return userType === USER_TYPE.TECHNICIAN;
}
