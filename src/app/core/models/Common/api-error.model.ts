/**
 * Contrat d'erreur normalisé renvoyé par l'API EKKLESIA.
 * `code` est STABLE (clé de traduction), `message` est un texte français lisible,
 * `reference` est à afficher à l'utilisateur pour le support.
 */
export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiError {
  success?: boolean;
  code?: string;
  message?: string;
  reference?: string;
  fields?: ApiFieldError[];
  detail?: string;
}

/** Codes d'erreur stables (miroir du backend). */
export const API_ERROR_CODES = {
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  PERMISSION_DENIED_CHURCH: 'PERMISSION_DENIED_CHURCH',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE: 'DUPLICATE',
  DUPLICATE_SERVICE: 'DUPLICATE_SERVICE',
  CONFLICT: 'CONFLICT',
  BUSINESS_RULE: 'BUSINESS_RULE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_TYPE_NOT_ALLOWED: 'FILE_TYPE_NOT_ALLOWED',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;
