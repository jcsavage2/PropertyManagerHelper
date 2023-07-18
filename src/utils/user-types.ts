import { PropertyManager, Technician, Tenant, UserType } from "@/context/user";

/**
 * @returns boolean, true if the current user is a tenant user.
 */
export function userIsTenant(user: UserType): user is Tenant {
  return user.pk.startsWith("T");
}
/**
 * @returns boolean, true if the current user is a PropertyManager.
 */
export function userIsPropertyManager(user: UserType): user is PropertyManager {
  return user.pk.startsWith("PM");
}
/**
 * @returns boolean, true if the current user is a Technician.
 */
export function userIsTechnician(user: UserType): user is Technician {
  return user.pk.startsWith("T");
}