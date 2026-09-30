import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { prepareImage } from './image-tools';

/**
 * Construit un FormData APRÈS compression/redimensionnement de l'image.
 * Utilisé par les services d'upload : tous les écrans en bénéficient sans
 * modification.
 */
export function compressedFormData(field: string, file: File): Observable<FormData> {
  return from(prepareImage(file)).pipe(
    map((img) => {
      const formData = new FormData();
      formData.append(field, img.file, img.file.name);
      return formData;
    })
  );
}
