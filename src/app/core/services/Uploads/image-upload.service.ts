import { Injectable } from '@angular/core';
import { prepareImage, validateImageFile, PreparedImage } from '../../utils/image-tools';

export type PrepareImageResult =
  | { ok: true; image: PreparedImage }
  | { ok: false; code: string; message: string };

/**
 * Service unique de préparation des photos : VALIDE (type + taille) puis
 * COMPRESSE (1600 px, qualité 0,8) avant envoi. Les écrans obtiennent un
 * résultat discriminé, facile à afficher (message clair en cas de refus).
 */
@Injectable({ providedIn: 'root' })
export class ImageUploadService {
  async prepare(file: File | null | undefined): Promise<PrepareImageResult> {
    const validation = validateImageFile(file);
    if (!validation.ok) {
      return { ok: false, code: validation.code, message: validation.message };
    }

    const image = await prepareImage(file as File);
    return { ok: true, image };
  }
}
