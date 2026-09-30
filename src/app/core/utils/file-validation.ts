import { API_ERROR_CODES } from '../models/Common/api-error.model';
import { IMAGE_LIMITS, formatBytes } from './image-tools';

/**
 * Validation de fichier AVANT envoi, réutilisable par tous les formulaires.
 * Les messages sont en français simple et indiquent la limite exacte.
 * (RG-P0-6 : type interdit / trop lourd → message distinct et compréhensible.)
 */
export interface FileValidationLimits {
  allowedTypes: readonly string[];
  maxBytes: number;
  /** Libellé du fichier attendu (ex. « photo », « document »). */
  kindLabel?: string;
  /** Extensions lisibles pour le message (ex. ['jpg','png']). */
  allowExtensions?: readonly string[];
}

export interface FileValidationResult {
  ok: boolean;
  code?: string;
  message?: string;
}

export const IMAGE_FILE_LIMITS: FileValidationLimits = {
  allowedTypes: IMAGE_LIMITS.allowedTypes,
  maxBytes: IMAGE_LIMITS.maxInputBytes,
  kindLabel: 'photo',
  allowExtensions: ['jpg', 'png', 'webp'],
};

export const DOCUMENT_FILE_LIMITS: FileValidationLimits = {
  allowedTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ],
  maxBytes: 20 * 1024 * 1024,
  kindLabel: 'document',
  allowExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'],
};

function describeAllowed(limits: FileValidationLimits): string {
  if (limits.allowExtensions?.length) return limits.allowExtensions.join(', ');
  return limits.allowedTypes.map((t) => t.split('/')[1]).join(', ');
}

export function validateFile(
  file: File | null | undefined,
  limits: FileValidationLimits = IMAGE_FILE_LIMITS,
): FileValidationResult {
  if (!file) {
    return { ok: false, code: API_ERROR_CODES.MISSING_FIELD, message: 'Aucun fichier sélectionné.' };
  }
  if (limits.allowedTypes.length > 0 && !limits.allowedTypes.includes(file.type)) {
    return {
      ok: false,
      code: API_ERROR_CODES.FILE_TYPE_NOT_ALLOWED,
      message: `Format non autorisé. Choisissez ${limits.kindLabel ? 'un ' + limits.kindLabel : 'un fichier'} (${describeAllowed(limits)}).`,
    };
  }
  if (file.size > limits.maxBytes) {
    return {
      ok: false,
      code: API_ERROR_CODES.FILE_TOO_LARGE,
      message: `Fichier trop lourd (${formatBytes(file.size)}). Taille maximale : ${formatBytes(limits.maxBytes)}.`,
    };
  }
  return { ok: true };
}
