import { z } from 'zod';
import { validatePropertyWithId, validateProperty } from './basevalidators';
import { INVITE_STATUS, PTE, WO_STATUS } from '../constants';
import {
  CreateTenant_AddressSchema,
  AiJSONResponseSchema,
  ChatbotRequestSchema,
  CreateOrgSchema,
  CreatePMSchema,
  CreatePropertySchema,
  CreateTechnicianSchema,
  CreateTenantSchema,
  CreateWorkOrderSchema,
  FinishFormRequestSchema,
  GetAllWorkOrdersForUserSchema,
  GetPMSchema,
  GetPropertiesSchema,
  GetS3BucketSchema,
  GetSchema,
  GetTechsForOrgSchema,
  GetTenantsForOrgSchema,
  GetUserSchema,
  GetWorkOrderEventsSchema,
  ImportTenantSchema,
  IssueInformationSchema,
  ReinviteTenantsSchema,
  CreateTenant_TenantInfoSchema,
  UpdateImagesSchema,
  UpdateUserSchema,
  UpdateViewedWORequestSchema,
  UpdateWorkOrderSchema,
  UserInfoSchema,
  AddWorkOrderModalSchema,
  CreateCommentSchema,
  GetPropertiesByAddressSchema,
  GetPropertyEventsSchema,
  GetPropertyByIdSchema,
  EditPropertySchema,
  GetUsersSchema,
  AddRemoveTenantToPropertySchema,
  DeleteWorkOrderSchema,
  DeleteUserSchema,
  AssignRemoveTechnicianSchema,
} from './customschemas';
import { ChatCompletionRequestMessage } from 'openai';

export type PTE_Type = (typeof PTE)[keyof typeof PTE];

export type Property = z.infer<typeof validateProperty>;
export type PropertyWithId = z.infer<typeof validatePropertyWithId>;

export type Option = {
  value: string;
  label: string;
};

export type StatusOption = Option & {
  icon: any;
};

export type AddressOption = {
  label: string;
  value: any;
};

export type ChatMessage = ChatCompletionRequestMessage & {
  ksuId?: string;
};

export type WoStatus = (typeof WO_STATUS)[keyof typeof WO_STATUS];

export type InviteStatus = (typeof INVITE_STATUS)[keyof typeof INVITE_STATUS];

export type DeleteUser = { pk: string; sk: string; name: string };

export type GetUserBody = z.infer<typeof GetUserSchema>;

export type GetUsersBody = z.infer<typeof GetUsersSchema>;

export type AddRemoveTenantToProperty = z.infer<typeof AddRemoveTenantToPropertySchema>;

export type AssignRemoveTechnician = z.infer<typeof AssignRemoveTechnicianSchema>;

export type IssueInformation = z.infer<typeof IssueInformationSchema>;

export type ChatbotRequest = z.infer<typeof ChatbotRequestSchema>;

export type UserInfo = z.infer<typeof UserInfoSchema>;

export type AiJSONResponse = z.infer<typeof AiJSONResponseSchema>;

export type FinishFormRequest = z.infer<typeof FinishFormRequestSchema>;

export type CreateWorkOrder = z.infer<typeof CreateWorkOrderSchema>;

export type CreateProperty = z.infer<typeof CreatePropertySchema>;

export type EditProperty = z.infer<typeof EditPropertySchema>;

export type DeleteWorkOrder = z.infer<typeof DeleteWorkOrderSchema>;

export type DeleteUserBody = z.infer<typeof DeleteUserSchema>;

export type GetPM = z.infer<typeof GetPMSchema>;

export type GetProperties = z.infer<typeof GetPropertiesSchema>;

export type GetPropertiesByAddress = z.infer<typeof GetPropertiesByAddressSchema>;

export type GetPropertyById = z.infer<typeof GetPropertyByIdSchema>;

export type GetTenantsForOrg = z.infer<typeof GetTenantsForOrgSchema>;

export type GetAllWorkOrdersForUser = z.infer<typeof GetAllWorkOrdersForUserSchema>;

export type GetTechsForOrg = z.infer<typeof GetTechsForOrgSchema>;

export type GetWorkOrderEvents = z.infer<typeof GetWorkOrderEventsSchema>;

export type GetPropertyEvents = z.infer<typeof GetPropertyEventsSchema>;

export type GetS3BucketBody = z.infer<typeof GetS3BucketSchema>;

export type ImportTenant = z.infer<typeof ImportTenantSchema>;

export type CreateTenant_TenantInfo = z.infer<typeof CreateTenant_TenantInfoSchema>;

export type CreateTenant_Address = z.infer<typeof CreateTenant_AddressSchema>;

export type CreateTenant = z.infer<typeof CreateTenantSchema>;

export type UpdateWorkOrder = z.infer<typeof UpdateWorkOrderSchema>;

export type UpdateImages = z.infer<typeof UpdateImagesSchema>;

export type CreateOrg = z.infer<typeof CreateOrgSchema>;

export type CreatePM = z.infer<typeof CreatePMSchema>;

export type CreateTechnician = z.infer<typeof CreateTechnicianSchema>;

export type GetBody = z.infer<typeof GetSchema>;

export type ReinviteTenantsBody = z.infer<typeof ReinviteTenantsSchema>;

export type UpdateUser = z.infer<typeof UpdateUserSchema>;

export type UpdateViewedWORequest = z.infer<typeof UpdateViewedWORequestSchema>;

export type CreatePMSchemaType = z.infer<typeof CreatePMSchema>;

export type AddWorkOrder = z.infer<typeof AddWorkOrderModalSchema>;

export type CreateComment = z.infer<typeof CreateCommentSchema>;
