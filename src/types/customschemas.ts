import { z } from 'zod';
import {
  lowerCaseOptionalEmail,
  lowerCaseOptionalString,
  lowerCaseRequiredEmail,
  lowerCaseRequiredString,
  nullableString,
  optionalString,
  requiredString,
  validateInviteStatusFilter,
  validatePTE,
  validateProperty,
  validateStartKey,
  validateWoStatus,
  validateUserType,
  validateWoStatusFilter,
  requiredNumber,
  validatePropertyWithId,
  upperCaseOptionalString,
} from './basevalidators';

export const GetSchema = z.object({
  pk: requiredString,
  sk: requiredString,
});

export const GetUserSchema = z.object({
  email: lowerCaseRequiredEmail,
});

export const GetUsersSchema = z.object({
  emails: z.array(lowerCaseRequiredEmail),
})

export const UpdateUserSchema = z.object({
  pk: requiredString,
  sk: requiredString,
  hasSeenDownloadPrompt: z.boolean().optional(),
});

export const AddRemoveTenantToPropertySchema = z.object({
  propertyUUId: requiredString,
  tenantEmail: lowerCaseRequiredEmail,
  tenantName: lowerCaseRequiredString,
  pmEmail: lowerCaseRequiredEmail,
  pmName: lowerCaseRequiredString,
  remove: z.boolean()
});

export const AssignRemoveTechnicianSchema = z.object({
  pk: requiredString,
  technicianEmail: lowerCaseRequiredEmail,
  technicianName: lowerCaseRequiredString,
  pmEmail: lowerCaseRequiredEmail,
  pmName: lowerCaseRequiredString,
});

export const IssueInformationSchema = z.object({
  issueLocation: nullableString,
  issueDescription: nullableString,
  additionalDetails: nullableString,
});

export const ChatbotRequestSchema = IssueInformationSchema.merge(
  z.object({
    userMessage: requiredString,
    unitInfo: lowerCaseRequiredString,
    streetAddress: lowerCaseRequiredString,
    messages: z.array(z.any()),
  })
);

export const UserInfoSchema = z.object({
  createdByType: validateUserType,
  creatorEmail: lowerCaseRequiredEmail,
  creatorName: lowerCaseRequiredString,
  organization: optionalString,
  permissionToEnter: validatePTE,
  tenantEmail: optionalString,
  tenantName: optionalString,
  property: validateProperty,
});

export const AiJSONResponseSchema = IssueInformationSchema.merge(
  z.object({ aiMessage: requiredString })
);

export const FinishFormRequestSchema = IssueInformationSchema.merge(
  z.object({
    userMessage: requiredString,
    messages: z.array(z.any()),
  })
);

export const CreateWorkOrderSchema = z.object({
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
  createdByType: validateUserType,
  property: validateProperty,
  woId: requiredString,
  images: z.array(requiredString).default([]).optional(),
  organization: requiredString,
});

export const CreatePropertySchema = validateProperty.merge(
  z.object({
    tenantEmail: lowerCaseOptionalEmail,
    organization: requiredString,
    pmEmail: lowerCaseRequiredEmail,
    pmName: lowerCaseRequiredString,
  })
);

export const EditPropertySchema = validateProperty.merge(
  z.object({
    organization: requiredString,
    pmEmail: lowerCaseRequiredEmail,
    pmName: lowerCaseRequiredString,
  })
);

export const DeleteWorkOrderSchema = z.object({
  pk: requiredString,
  sk: requiredString,
  madeByEmail: lowerCaseRequiredEmail,
  madeByName: lowerCaseRequiredString,
});

export const DeleteUserSchema = z.object({
  pk: requiredString,
  sk: requiredString,
  madeByEmail: lowerCaseRequiredEmail,
  madeByName: lowerCaseRequiredString,
  roleToDelete: requiredString,
});

export const AddWorkOrderModalSchema = z.object({
  issueDescription: requiredString,
  tenantEmail: lowerCaseRequiredEmail,
  permissionToEnter: validatePTE,
  issueLocation: optionalString,
  additionalDetails: optionalString,
});

export const GetPMSchema = z.object({
  organization: requiredString,
  startKey: validateStartKey,
});

export const GetPropertiesSchema = z.object({
  startKey: validateStartKey,
  organization: requiredString,
  propertySearchString: upperCaseOptionalString,
});

export const GetPropertiesByAddressSchema = z.object({
  property: validateProperty,
  organization: requiredString,
});

export const GetPropertyByIdSchema = z.object({
  propertyId: requiredString,
});

export const GetTenantsForOrgSchema = z.object({
  organization: requiredString,
  startKey: validateStartKey,
  statusFilter: validateInviteStatusFilter.optional(),
  tenantSearchString: lowerCaseOptionalString,
  fetchAllTenants: z.boolean().optional().default(false),
});

export const GetAllWorkOrdersForUserSchema = z.object({
  email: lowerCaseRequiredEmail,
  userType: validateUserType,
  orgId: optionalString,
  startKey: validateStartKey,
  statusFilter: validateWoStatusFilter,
  reverse: z.boolean().optional().default(true),
});

export const GetTechsForOrgSchema = z.object({
  organization: requiredString,
  startKey: validateStartKey,
  techSearchString: lowerCaseOptionalString,
});

export const GetWorkOrderEventsSchema = z.object({
  workOrderId: requiredString,
  startKey: validateStartKey.optional(),
});

export const GetPropertyEventsSchema = z.object({
  propertyId: requiredString,
  startKey: validateStartKey.optional(),
});

export const GetS3BucketSchema = z.object({
  bucket: requiredString,
  key: requiredString,
});

export const CreateTenant_TenantInfoSchema = z.object({
  tenantEmail: lowerCaseOptionalEmail,
  tenantName: lowerCaseRequiredString,
  organization: requiredString,
  organizationName: lowerCaseRequiredString,
  pmEmail: lowerCaseRequiredEmail,
  pmName: lowerCaseRequiredString,
});

export const CreateTenant_AddressSchema = z.object({
  property: z.union([validatePropertyWithId, z.null()]),
});

export const CreateTenantSchema = CreateTenant_AddressSchema.merge(
  CreateTenant_TenantInfoSchema
).merge(z.object({ createNewProperty: z.boolean().default(true) }));

export const ImportTenantSchema = CreateTenantSchema.merge(
  z.object({
    key: requiredNumber,
    error: optionalString,
    warning: optionalString,
  })
);

export const UpdateWorkOrderSchema = z
  .object({
    pk: z.string(),
    sk: z.string(),
    email: lowerCaseRequiredEmail,
    name: lowerCaseRequiredString,
    status: validateWoStatus.optional(),
    permissionToEnter: validatePTE.optional(),
  })
  .refine(
    (data) => {
      return !!data.status !== !!data.permissionToEnter;
    },
    { message: 'Must provide either status or permissionToEnter' }
  );

export const UpdateImagesSchema = z.object({
  pk: requiredString,
  sk: requiredString,
  images: z.array(requiredString),
  addNew: z.boolean().optional().default(false),
});

export const CreateOrgSchema = z.object({
  orgName: lowerCaseRequiredString,
});

export const CreatePMSchema = z.object({
  userEmail: lowerCaseRequiredEmail,
  userName: lowerCaseRequiredString,
  organization: requiredString,
  organizationName: lowerCaseRequiredString,
  isAdmin: z.boolean().default(false),
});

export const CreateTechnicianSchema = z.object({
  technicianEmail: lowerCaseRequiredEmail,
  technicianName: lowerCaseRequiredString,
  pmEmail: lowerCaseRequiredEmail,
  pmName: lowerCaseRequiredString,
  organization: requiredString,
  organizationName: lowerCaseRequiredString,
});

export const ReinviteTenantsSchema = z.object({
  tenants: z.array(z.object({ name: lowerCaseRequiredString, email: lowerCaseRequiredEmail })),
  pmName: lowerCaseRequiredString,
  organizationName: lowerCaseRequiredString,
});

export const UpdateViewedWORequestSchema = z.object({
  pk: requiredString,
  sk: requiredString,
  newViewedWOList: z.array(requiredString),
  email: lowerCaseRequiredEmail,
  pmEmail: lowerCaseRequiredEmail,
});

export const CreateCommentSchema = z.object({
  comment: requiredString,
  email: lowerCaseRequiredEmail,
  name: lowerCaseRequiredString,
  workOrderId: requiredString,
});
