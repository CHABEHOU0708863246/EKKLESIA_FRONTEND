export interface EkklesiaJwtPayload {
  unique_name: string;
  role: string | string[];
  exp: number;
  userId: string;
  email?: string;
}
