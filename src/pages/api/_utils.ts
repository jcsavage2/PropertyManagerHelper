import { API_STATUS } from '@/constants';
import { MailService } from '@sendgrid/mail';
import { ApiError, ApiResponse } from './_types';

export const MISSING_ENV = (envName: string) => `Missing ${envName} environment variable.`;
export const INVALID_PARAM_ERROR = (paramName: string) => `Invalid ${paramName} parameter`;

// Validates the env variable and sets the api key for sendgrid
export function initializeSendgrid(sendgrid: MailService, apiKey: string | undefined) {
  if (!apiKey) {
    throw new ApiError(
      API_STATUS.INTERNAL_SERVER_ERROR,
      MISSING_ENV('NEXT_PUBLIC_SENDGRID_API_KEY'),
    );
  }
  sendgrid.setApiKey(apiKey);
}

export function errorToResponse(error: any) {
  return { response: '', userErrorMessage: error?.showToUser ? error.message : undefined };
}
