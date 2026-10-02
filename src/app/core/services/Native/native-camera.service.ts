import { Injectable, inject } from '@angular/core';
import { PlatformService } from './platform.service';

/**
 * Prise de photo / sélection d'image, unifiée web + natif.
 *
 * - Natif (Capacitor) : ouvre la caméra ou la galerie via @capacitor/camera.
 * - Web : ouvre un sélecteur de fichier classique.
 *
 * Retourne toujours un objet `File` prêt à être envoyé au backend.
 */
@Injectable({ providedIn: 'root' })
export class NativeCameraService {
  private readonly platform = inject(PlatformService);

  /**
   * @param source 'camera' pour prendre une photo, 'gallery' pour choisir une image.
   * @returns le fichier sélectionné, ou `null` si l'utilisateur annule.
   */
  async pickImage(source: 'camera' | 'gallery' = 'camera'): Promise<File | null> {
    if (this.platform.isNative) {
      return this.pickNative(source);
    }
    return this.pickWeb();
  }

  private async pickNative(source: 'camera' | 'gallery'): Promise<File | null> {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      });
      if (!photo.webPath) return null;

      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      const ext = (photo.format || 'jpeg').toLowerCase();
      return new File([blob], `photo-${Date.now()}.${ext}`, { type: blob.type || 'image/jpeg' });
    } catch {
      return null; // annulé ou refus de permission
    }
  }

  private pickWeb(): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.oncancel = () => resolve(null);
      input.click();
    });
  }
}
