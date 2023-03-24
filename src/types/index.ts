import { ChatCompletionRequestMessage } from 'openai'

export type ApiRequest = WorkOrder & {
  userMessage: string;
  messages: ChatCompletionRequestMessage[];
  flow: 'issueFlow' | 'userFlow';
};

export type AiJSONResponse = Partial<UserInfo> & IssueInformation & {
  aiMessage: string;
};

export type FinishFormRequest = IssueInformation & {
  userMessage: string;
  messages: ChatCompletionRequestMessage[];
};

type UserInfo = {
  address: string | null;
  email: string | null;
  name: string | null;
  permissionToEnter: boolean | null;
  propertyManagerEmail: string | null;
}

export type IssueInformation = {
  issueLocation: string | null;
  issueCategory: string | null;
  issueSubCategory: string | null;
}

export type WorkOrder = UserInfo & IssueInformation