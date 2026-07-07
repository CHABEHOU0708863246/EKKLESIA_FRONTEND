export interface LoginResponse {
  token: string;
  refreshToken: string;
  success: boolean;
  errorMessage: string;
  status?: boolean;
}
