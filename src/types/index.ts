import { ChatCompletionRequestMessage } from 'openai';
import { Events } from '../constants';

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
  permissionToEnter: "yes" | "no";
};

export type IssueInformation = {
  issueLocation: string | null;
  issueDescription: string | null;
};

export type WorkOrder = IssueInformation;

export type EventType = typeof Events[keyof typeof Events];

export type OptionType = {
  value: string;
  label: string;
};