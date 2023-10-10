import { STATE_OPTIONS } from '@/components/state-select';
import { AiJSONResponse } from '@/types';

export const findIssueSample: AiJSONResponse = {
  aiMessage: '<your AI generated conversational response>',
  issueDescription: '<value of the issueDescription>',
  issueLocation: '<value of issueLocation>',
  additionalDetails: '<value of additionalDetails>',
};

export const STATUS = {
  TO_DO: 'TO_DO',
  COMPLETE: 'COMPLETE',
  DELETED: 'DELETED',
};

export const PTE = {
  YES: 'Yes',
  NO: 'No',
} as const;

export const PAGE_SIZE = 60;
export const TECHNICIAN_DELIM = '##NAME##';
export const defaultProperty = { address: '', city: '', country: 'US', postalCode: '', unit: undefined, numBeds: 1, numBaths: 1, state: STATE_OPTIONS[0].value }
export const defaultPropertyWithId = { ...defaultProperty, propertyUUId: '' }

// ERRORS //
export const API_STATUS = {
  SUCCESS: 200,
  INTERNAL_SERVER_ERROR: 500,
}
export const USER_PERMISSION_ERROR = 'User does not have permission to perform this action.';
export const MISSING_ENV = (envName: string) => `Missing ${envName} environment variable.`;
export const EMAIL_MATCHING_ERROR = 'Cannot create a new user with the same email as your own account email'
export const INVALID_PARAM_ERROR = (paramName: string) => `Invalid ${paramName} parameter`;