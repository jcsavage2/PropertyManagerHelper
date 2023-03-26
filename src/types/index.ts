import { ChatCompletionRequestMessage } from 'openai'

export type ApiRequest = WorkOrder & {
  userMessage: string;
  messages: ChatCompletionRequestMessage[];
};

export type SendEmailApiRequest = UserInfo & IssueInformation & {
  propertyManagerEmail: string;
  companyEmail: string;
  messages: ChatCompletionRequestMessage[];
}

export type AiJSONResponse = Partial<UserInfo> & IssueInformation & {
  aiMessage: string;
};

export type FinishFormRequest = IssueInformation & {
  userMessage: string;
  messages: ChatCompletionRequestMessage[];
};

export type UserInfo = {
  address: string;
  email: string;
  name: string;
  permissionToEnter: string;
}

export type IssueInformation = {
  issueLocation: string | null;
  issueCategory: string | null;
  issueSubCategory: string | null;
}

export type WorkOrder = IssueInformation