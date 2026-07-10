// src/app/core/models/api-response.model.ts

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
  statusCode?: number;
  timestamp?: string;
}

// Version avec pagination
export interface ApiResponsePaginated<T> extends ApiResponse<T> {
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// Version sans données
export interface ApiResponseSimple {
  success: boolean;
  message: string;
  errors?: string[];
  statusCode?: number;
}

// Classe utilitaire
export class ApiResponseUtils {
  static success<T>(data: T, message: string = 'Opération réussie'): ApiResponse<T> {
    return {
      success: true,
      message,
      data
    };
  }

  static error(message: string, errors?: string[], statusCode: number = 400): ApiResponse<any> {
    return {
      success: false,
      message,
      data: null,
      errors,
      statusCode
    };
  }

  static paginated<T>(
    data: T,
    totalCount: number,
    page: number,
    pageSize: number
  ): ApiResponsePaginated<T> {
    return {
      success: true,
      message: 'Opération réussie',
      data,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      hasPreviousPage: page > 1,
      hasNextPage: page < Math.ceil(totalCount / pageSize)
    };
  }
}
