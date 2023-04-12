import { ChatCompletionRequestMessage } from 'openai';

export type ApiRequest = WorkOrder & {
  userMessage: string;
  messages: ChatCompletionRequestMessage[];
};

export type SendEmailApiRequest = UserInfo & IssueInformation & {
  messages: ChatCompletionRequestMessage[];
  pmEmail: string;
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
  unit?: string;
  state: string;
  city: string;
  country?: string;
  postalCode: string;
  tenantEmail: string;
  tenantName: string;
  permissionToEnter: string;
};

export type IssueInformation = {
  issueLocation: string | null;
  issueDescription: string | null;
};

export type WorkOrder = IssueInformation;