import { ChatCompletionRequestMessage } from "openai";
import { Events } from "../constants";

export type ApiRequest = WorkOrder & {
  userMessage: string;
  unitInfo: string;
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
  creatorEmail: string;
  creatorName: string;
  createdByType: "TENANT" | "PROPERTY_MANAGER" | "TECHNICIAN"  
  permissionToEnter: "yes" | "no";
  tenantEmail?: string;
  tenantName?: string;
};

export type IssueInformation = {
  issueLocation: string | null;
  issueDescription: string | null;
  additionalDetails: string | null;
};

export type WorkOrder = IssueInformation;

export type EventType = (typeof Events)[keyof typeof Events];

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
