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

export const INVITE_STATUS = {
  JOINED: 'JOINED',
  INVITED: 'INVITED',
  CREATED: 'CREATED',
  RE_INVITED: "RE_INVITED"
} as const;

export const ALL_TENANTS_FILTER = {
  JOINED: true,
  INVITED: true,
  CREATED: true,
  RE_INVITED: true,
}