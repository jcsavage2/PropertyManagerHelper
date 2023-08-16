import { useUserContext } from "@/context/user";
import { IUser } from "@/database/entities/user";


/**
 * @returns boolean, true if the current user is a tenant user.
 */
export function useUserIsTenant(user: IUser): user is IUser {
  const { userType } = useUserContext();
  return userType === "TENANT";
}
/**
 * @returns boolean, true if the current user is a PropertyManager.
 */
export function useUserIsPropertyManager(user: IUser): user is IUser {
  const { userType } = useUserContext();
  return userType === "PROPERTY_MANAGER";
}
/**
 * @returns boolean, true if the current user is a Technician.
 */
export function useUserIsTechnician(user: IUser): user is IUser {
  const { userType } = useUserContext();
  return userType === "TECHNICIAN";
}