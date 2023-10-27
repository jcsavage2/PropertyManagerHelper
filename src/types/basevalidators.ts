import { PTE, WO_STATUS } from '@/constants';
import { USER_TYPE } from '@/database/entities/user';
import { z } from 'zod';

export const requiredNumber = z.coerce.number();

// -- Strings -- //
export const requiredString = z.string().min(1, { message: 'Input is required' }).trim();
export const lowerCaseRequiredString = requiredString.toLowerCase();

export const nullableString = z.string().nullable().transform((val) => (val?.length ? val : null));

//Empty strings resolve to undefined
export const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((val) => (val?.length ? val : undefined));
export const lowerCaseOptionalString = z
  .string()
  .toLowerCase()
  .trim()
  .optional()
  .transform((val) => (val?.length ? val : undefined));

export const lowerCaseRequiredEmail = z.string().email({ message: 'Please use a valid email' }).min(1, { message: 'Input is required' }).toLowerCase().trim();
export const lowerCaseOptionalEmail = z.string().email({ message: 'Please use a valid email' }).min(1, { message: 'Input is required' }).toLowerCase().trim().optional(); 

// -- Addresses -- //
export const zipCode = z.string().min(1, { message: 'Input is required' }).max(10, { message: 'Input must be a zip code'}).trim();
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

// -- Other -- //
export const validatePTE = z.enum([PTE.YES, PTE.NO]);
export const validateUserType = z.enum([USER_TYPE.TENANT, USER_TYPE.TECHNICIAN, USER_TYPE.PROPERTY_MANAGER]);
export const validateStartKey = z.any().optional();

export const validateInviteStatusFilter = z.object({
  JOINED: z.boolean(),
  INVITED: z.boolean(),
  RE_INVITED: z.boolean(),
  CREATED: z.boolean().optional(),
})

export const validateWoStatus = z.enum([WO_STATUS.COMPLETE, WO_STATUS.DELETED, WO_STATUS.TO_DO]);
export const validateWoStatusFilter = z.object({
  TO_DO: z.boolean(),
  COMPLETE: z.boolean(),
})