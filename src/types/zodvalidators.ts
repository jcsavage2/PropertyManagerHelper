import { PTE, STATUS } from '@/constants';
import { userRoles } from '@/database/entities/user';
import { z } from 'zod';

// Basic Types //
export const requiredString = z.string().min(1, { message: 'Input is required' }).trim();
export const lowerCaseRequiredString = requiredString.toLowerCase();

export const nullableString = z.string().nullable().transform((val) => (val?.length ? val : null));

//Empty strings resolve to undefined
export const optionalStringCaseSensitive = z
  .string()
  .trim()
  .optional()
  .transform((val) => (val?.length ? val : undefined));
export const optionalString = z
  .string()
  .toLowerCase()
  .trim()
  .optional()
  .transform((val) => (val?.length ? val : undefined));

export const lowerCaseRequiredEmail = z.string().email({ message: 'Please use a valid email' }).min(1).toLowerCase().trim();
export const requiredNumber = z.coerce.number();

export const validatePTE = z.enum([PTE.YES, PTE.NO]);
export const validateUserRole = z.enum([userRoles.TENANT, userRoles.TECHNICIAN, userRoles.PROPERTY_MANAGER]);
export const validateStatus = z.enum([STATUS.COMPLETE, STATUS.DELETED, STATUS.TO_DO]);

// Address Types //
export const zipCode = z.string().min(1, { message: 'Input is required' }).max(10).toLowerCase().trim();
export const country = z.string().min(1).max(2).trim().toUpperCase().default('US'); //Default to the US for now
export const validateProperty = z.object({
  address: lowerCaseRequiredString,
  city: lowerCaseRequiredString,
  state: lowerCaseRequiredString,
  country: country,
  postalCode: zipCode,
  unit: optionalString,
  numBeds: requiredNumber.default(1),
  numBaths: requiredNumber.default(1),
});
export const validatePropertyWithId = validateProperty.extend({ propertyUUId: lowerCaseRequiredString });
