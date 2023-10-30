export class ApiError extends Error {
  constructor(public statusCode: number, public message: string, public showToUser: boolean = false) {
    super(message);
  }
}

export type ApiResponse = {
  response: string;
  userErrorMessage?: string;
};