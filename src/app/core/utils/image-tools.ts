import { API_ERROR_CODES } from '../models/Common/api-error.model';

/**
 * Outils image côté client : validation AVANT envoi, compression/redimensionnement
 * (max 1600 px, qualité 0,8, JPEG) et génération d'une miniature (aperçu).
 *
 * Fonctionne en SSR / tests sans canvas : dans ce cas, la compression est
 * neutralisée et le fichier d'origine est renvoyé (aucune exception).
 */

export const IMAGE_LIMITS = {
  /** Taille maximale acceptée à l'entrée (avant compression). */
  maxInputBytes: 12 * 1024 * 1024, // 12 Mo
  /** Dimension maximale conservée (le plus grand côté). */
  maxDimension: 1600,
  /** Qualité JPEG de sortie. */
  quality: 0.8,
  /** Dimension des miniatures. */
  thumbnailDimension: 320,
  /** Types d'image acceptés. */
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
};

export interface ImageValidationError {
  ok: false;
  code: string;
  message: string;
}

export type ImageValidationResult = { ok: true } | ImageValidationError;

export interface PreparedImage {
  file: File;
  previewUrl: string;
  originalBytes: number;
  finalBytes: number;
  compressed: boolean;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/** Valide un fichier image (type + taille) AVANT tout traitement. */
export function validateImageFile(file: File | null | undefined): ImageValidationResult {
  if (!file) {
    return { ok: false, code: API_ERROR_CODES.MISSING_FIELD, message: 'Aucun fichier sélectionné.' };
  }
  if (!IMAGE_LIMITS.allowedTypes.includes(file.type as any)) {
    return {
      ok: false,
      code: API_ERROR_CODES.FILE_TYPE_NOT_ALLOWED,
      message: 'Format non autorisé. Utilisez une photo JPEG, PNG ou WebP.',
    };
  }
  if (file.size > IMAGE_LIMITS.maxInputBytes) {
    return {
      ok: false,
      code: API_ERROR_CODES.FILE_TOO_LARGE,
      message: `La photo est trop lourde (${formatBytes(file.size)}). Maximum ${formatBytes(IMAGE_LIMITS.maxInputBytes)}.`,
    };
  }
  return { ok: true };
}

function hasCanvas(): boolean {
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
    img.src = url;
  });
}

function scale(img: HTMLImageElement, maxDimension: number): { width: number; height: number } {
  const { width, height } = img;
  const largest = Math.max(width, height);
  if (largest <= maxDimension) return { width, height };
  const ratio = maxDimension / largest;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

function canvasToFile(canvas: HTMLCanvasElement, name: string, quality: number): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error('Compression impossible')); return; }
        const outName = name.replace(/\.[^.]+$/, '') + '.jpg';
        resolve(new File([blob], outName, { type: 'image/jpeg', lastModified: Date.now() }));
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Compresse et redimensionne une image. Renvoie aussi une miniature (data URL)
 * pour l'aperçu. Échec de compression → renvoie le fichier d'origine (jamais
 * bloquant).
 */
export async function prepareImage(
  file: File,
  opts?: { maxDimension?: number; quality?: number }
): Promise<PreparedImage> {
  const maxDimension = opts?.maxDimension ?? IMAGE_LIMITS.maxDimension;
  const quality = opts?.quality ?? IMAGE_LIMITS.quality;

  const fallback: PreparedImage = {
    file,
    previewUrl: '',
    originalBytes: file.size,
    finalBytes: file.size,
    compressed: false,
  };

  if (!hasCanvas()) return fallback;

  try {
    const img = await loadImage(file);
    const { width, height } = scale(img, maxDimension);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return fallback;

    ctx.drawImage(img, 0, 0, width, height);
    const compressed = await canvasToFile(canvas, file.name, quality);

    const previewUrl = canvas.toDataURL('image/jpeg', 0.7);

    // On ne renvoie le fichier compressé que s'il est réellement plus léger.
    if (compressed.size >= file.size) {
      return { ...fallback, previewUrl };
    }

    return {
      file: compressed,
      previewUrl,
      originalBytes: file.size,
      finalBytes: compressed.size,
      compressed: true,
    };
  } catch {
    return fallback;
  }
}
