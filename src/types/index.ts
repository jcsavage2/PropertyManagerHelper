import { ChatCompletionRequestMessage } from 'openai';
import { PTE, STATUS } from '../constants';
import { z } from 'zod';
import {
  validatePropertyWithId,
  validateProperty,
  lowerCaseRequiredEmail,
  lowerCaseRequiredString,
  requiredString,
  validatePTE,
  validateStatus,
  nullableString,
  validateUserRole,
  optionalString,
  lowerCaseOptionalEmail,
  lowerCaseOptionalString,
} from './zodvalidators';

export type StatusType = (typeof STATUS)[keyof typeof STATUS];
export type PTE_Type = (typeof PTE)[keyof typeof PTE];

export type PropertyType = z.infer<typeof validateProperty>;
export type PropertyTypeWithId = z.infer<typeof validatePropertyWithId>;

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

export const AssignTechnicianSchema = z.object({
  organization: lowerCaseRequiredString,
  ksuID: z.string().min(1),
  technicianEmail: lowerCaseRequiredEmail,
  technicianName: lowerCaseRequiredString,
  workOrderId: z.string().min(1),
  property: validateProperty,
  status: validateStatus,
  issueDescription: lowerCaseRequiredString,
  permissionToEnter: validatePTE,
  pmEmail: lowerCaseRequiredEmail,
  pmName: lowerCaseRequiredString,
  tenantEmail: lowerCaseRequiredEmail,
  tenantName: lowerCaseRequiredString,
  oldAssignedTo: z.set(z.string()),
});
export type AssignTechnicianBody = z.infer<typeof AssignTechnicianSchema>;

export const RemoveTechnicianSchema = z.object({
  workOrderId: z.string().min(1),
  pmEmail: lowerCaseRequiredEmail,
  technicianEmail: lowerCaseRequiredEmail,
  technicianName: lowerCaseRequiredString,
  pmName: lowerCaseRequiredString,
  oldAssignedTo: z.set(requiredString),
  oldViewedWO: z.array(requiredString),
});
export type RemoveTechnicianBody = z.infer<typeof RemoveTechnicianSchema>;

export const IssueInformationSchema = z.object({
  issueLocation: nullableString,
  issueDescription: nullableString,
  additionalDetails: nullableString,
});
export type IssueInformation = z.infer<typeof IssueInformationSchema>;

export const ChatbotRequestSchema = IssueInformationSchema.merge(
  z.object({
    userMessage: requiredString,
    unitInfo: lowerCaseRequiredString,
    streetAddress: lowerCaseRequiredString,
    messages: z.array(z.any()),
  })
);
export type ChatbotRequest = z.infer<typeof ChatbotRequestSchema>;

// export type ChatbotRequest = IssueInformation & {
//   userMessage: string;
//   unitInfo: string;
//   streetAddress: string;
//   messages: ChatCompletionRequestMessage[];
// };

export const UserInfoSchema = z.object({
  createdByType: validateUserRole,
  creatorEmail: lowerCaseRequiredEmail,
  creatorName: lowerCaseRequiredString,
  organization: optionalString,
  permissionToEnter: validatePTE,
  tenantEmail: optionalString,
  tenantName: optionalString,
  property: validateProperty,
});
export type UserInfo = z.infer<typeof UserInfoSchema>;

// export type UserInfo = {
//   address: string;
//   city: string;
//   country?: string;
//   createdByType: 'TENANT' | 'PROPERTY_MANAGER' | 'TECHNICIAN';
//   creatorEmail: string;
//   creatorName: string;
//   organization?: string;
//   permissionToEnter: PTE_Type;
//   postalCode: string;
//   state: string;
//   tenantEmail?: string;
//   tenantName?: string;
//   unit?: string;
// };

// export const SendEmailApiRequestSchema = UserInfoSchema.merge(IssueInformationSchema).merge(
//   z.object({
//     messages: z.array(z.any()),
//     pmEmail: lowerCaseRequiredEmail,
//     pmName: lowerCaseRequiredString,
//     organization: lowerCaseRequiredString,
//     woId: lowerCaseRequiredString,
//     images: z.array(z.string()),
//   })
// );
// export type SendEmailApiRequest = z.infer<typeof SendEmailApiRequestSchema>;

// // export type SendEmailApiRequest = UserInfo &
// //   IssueInformation & {
// //     messages: ChatCompletionRequestMessage[];
// //     pmEmail: string;
// //     pmName?: string;
// //     organization: string;
// //     woId: string;
// //     images: string[];
// //   };

export const AiJSONResponseSchema = IssueInformationSchema.merge(z.object({ aiMessage: requiredString }));
export type AiJSONResponse = z.infer<typeof AiJSONResponseSchema>;
// export type AiJSONResponse = IssueInformation & {
//   aiMessage: string;
// };

export const FinishFormRequestSchema = IssueInformationSchema.merge(
  z.object({
    userMessage: requiredString,
    messages: z.array(z.any()),
  })
);
export type FinishFormRequest = z.infer<typeof FinishFormRequestSchema>;
// export type FinishFormRequest = IssueInformation & {
//   userMessage: string;
//   messages: ChatCompletionRequestMessage[];
// };

export const CreateWorkOrderFullSchema = z.object({
  issueDescription: requiredString,
  issueLocation: optionalString,
  additionalDetails: optionalString,
  permissionToEnter: validatePTE,
  tenantEmail: lowerCaseOptionalEmail,
  tenantName: lowerCaseOptionalString,
  pmEmail: lowerCaseRequiredEmail,
  pmName: lowerCaseOptionalString,
  messages: z.array(z.any()).default([]).optional(),
  creatorEmail: lowerCaseRequiredEmail,
  creatorName: lowerCaseRequiredString,
  createdByType: validateUserRole,
  property: validateProperty,
  woId: z.string().min(1),
  images: z.array(z.string()).default([]).optional(),
  organization: lowerCaseRequiredString,
});
export type CreateWorkOrderSchemaType = z.infer<typeof CreateWorkOrderFullSchema>;

export type ApiError = {
  message: string;
  code: number;
};
