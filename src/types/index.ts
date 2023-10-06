import { ChatCompletionRequestMessage } from 'openai';
import { PTE, STATUS } from '../constants';

export type ApiRequest = WorkOrder & {
  userMessage: string;
  unitInfo: string;
  streetAddress: string;
  messages: ChatCompletionRequestMessage[];
};

export type SendEmailApiRequest = UserInfo &
  IssueInformation & {
    messages: ChatCompletionRequestMessage[];
    pmEmail: string;
    pmName?: string;
    organization: string;
    woId: string;
    images: string[];
  };

export type AiJSONResponse = IssueInformation & {
  aiMessage: string;
};

export type FinishFormRequest = IssueInformation & {
  userMessage: string;
  messages: ChatCompletionRequestMessage[];
};

export type UserInfo = {
  address: string;
  city: string;
  country?: string;
  createdByType: 'TENANT' | 'PROPERTY_MANAGER' | 'TECHNICIAN';
  creatorEmail: string;
  creatorName: string;
  organization?: string;
  permissionToEnter: PTE_Type;
  postalCode: string;
  state: string;
  tenantEmail?: string;
  tenantName?: string;
  unit?: string;
};

export type IssueInformation = {
  issueLocation: string | null;
  issueDescription: string | null;
  additionalDetails: string | null;
};

export type WorkOrder = IssueInformation;

export type OptionType = {
  value: string;
  label: string;
};

export type StatusOptionType = OptionType & {
  icon: any;
};

export type AddressOptionType = {
  label: string;
  value: any;
};

export type PTE_Type = (typeof PTE)[keyof typeof PTE];

export type StatusType = (typeof STATUS)[keyof typeof STATUS];
