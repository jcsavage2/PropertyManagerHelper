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