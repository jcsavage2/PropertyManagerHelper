import { STATE_OPTIONS } from '@/components/state-select';
import { AiJSONResponse, DeleteUser, Property } from '@/types';

export const AI_MESSAGE_START = '##AI_MESSAGE_START##';

export const findIssueSample: AiJSONResponse = {
  aiMessage: AI_MESSAGE_START + '<your conversational response>\n',
  issueDescription: '<value of the issueDescription>',
  issueLocation: '<value of issueLocation>',
  additionalDetails: '<value of additionalDetails>',
};

export const WO_STATUS = {
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
export const DEFAULT_PROPERTY: Property = {
  address: '',
  city: '',
  country: 'US',
  postalCode: '',
  unit: undefined,
  numBeds: 1,
  numBaths: 1,
  state: STATE_OPTIONS[0].value,
};
export const DEFAULT_PROPERTY_WITH_ID = { ...DEFAULT_PROPERTY, propertyUUId: '' };

export const DEFAULT_DELETE_USER: DeleteUser = { pk: '', sk: '', name: '', roles: [] };

export const INVITE_STATUS = {
  JOINED: 'JOINED',
  INVITED: 'INVITED',
  CREATED: 'CREATED',
  RE_INVITED: 'RE_INVITED',
} as const;

export const ALL_TENANTS_FILTER = {
  JOINED: true,
  INVITED: true,
  CREATED: true,
  RE_INVITED: true,
};

// ERRORS //
export const API_STATUS = {
  SUCCESS: 200,
  INTERNAL_SERVER_ERROR: 500,
  FORBIDDEN: 403,
  UNAUTHORIZED: 401,
  BAD_REQUEST: 400,
};
export const USER_PERMISSION_ERROR = 'User does not have permission to perform this action.';
