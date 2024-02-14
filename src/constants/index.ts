import { STATE_OPTIONS } from '@/components/dropdowns/state-select';
import { DeleteUser, Property } from '@/types';

//NOTE: Needs to maintain parity with pillar-edge constant of the same name!
export const AI_MESSAGE_START = '##AI_MESSAGE_START##';

export const WO_STATUS = {
  TO_DO: 'TO_DO',
  COMPLETE: 'COMPLETE',
  DELETED: 'DELETED',
};

export const PTE = {
  YES: 'Yes',
  NO: 'No',
};

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

export const DEFAULT_DELETE_USER: DeleteUser = { pk: '', sk: '', name: '' };

export const WORK_ORDER_TYPE = {
  MAINTENANCE_REQUEST: 'Maintenance Request',
  APPLIANCE_REPAIR: 'Appliance Repair',
  PAINT_JOB: 'Paint Job',
  CARPET_JOB: 'Carpet Job',
};

export const WORK_ORDER_TYPE_OPTIONS = [
  { label: WORK_ORDER_TYPE.MAINTENANCE_REQUEST, value: WORK_ORDER_TYPE.MAINTENANCE_REQUEST },
  { label: WORK_ORDER_TYPE.APPLIANCE_REPAIR, value: WORK_ORDER_TYPE.APPLIANCE_REPAIR },
  { label: WORK_ORDER_TYPE.PAINT_JOB, value: WORK_ORDER_TYPE.PAINT_JOB },
  { label: WORK_ORDER_TYPE.CARPET_JOB, value: WORK_ORDER_TYPE.CARPET_JOB },
];

export const DEFAULT_ADD_WORK_ORDER = {
  workOrderType: WORK_ORDER_TYPE.MAINTENANCE_REQUEST,
  issueDescription: undefined,
  tenantEmail: undefined,
  propertyUUID: undefined,
  permissionToEnter: PTE.YES,
  issueLocation: undefined,
  additionalDetails: undefined,
  apartmentSize: undefined,
  areasForCarpeting: [],
  areasForPadding: [],
  moveInDate: undefined,
};

export const INVITE_STATUS = {
  JOINED: 'JOINED',
  INVITED: 'INVITED',
  CREATED: 'CREATED',
  RE_INVITED: 'RE_INVITED',
};

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

export const NO_EMAIL_PREFIX = 'testsimco+';

export const DEFAULT_CARPETING_PADDING_OPTIONS = [
  { label: 'Upstairs Bedroom', value: 'upstairs bedroom' },
  { label: 'Upstairs Hallway', value: 'upstairs hallway' },
  { label: 'Downstairs Bedroom', value: 'downstairs bedroom' },
  { label: 'Living Room', value: 'living room' },
  { label: 'Stairs', value: 'stairs' },
];
