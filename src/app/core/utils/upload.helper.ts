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

/**
 * Construit un FormData MULTI-FICHIERS après compression de chaque image
 * (RG-PHOTO : 1 à 5 photos envoyées sous le même nom de champ, ex. « photos »).
 */
export function compressedFormDataMulti(field: string, files: File[]): Observable<FormData> {
  return from(Promise.all(files.map((f) => prepareImage(f)))).pipe(
    map((images) => {
      const formData = new FormData();
      images.forEach((img) => formData.append(field, img.file, img.file.name));
      return formData;
    })
  );
}
