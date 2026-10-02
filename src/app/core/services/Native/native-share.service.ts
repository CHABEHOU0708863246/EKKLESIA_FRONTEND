import { Injectable, inject } from '@angular/core';
import { PlatformService } from './platform.service';

/**
 * Partage d'un contenu (lien d'inscription à un événement, etc.).
 * Natif : feuille de partage système. Web : Web Share API avec repli copie.
 */
@Injectable({ providedIn: 'root' })
export class NativeShareService {
  private readonly platform = inject(PlatformService);

  async share(options: { title?: string; text?: string; url?: string }): Promise<void> {
    if (this.platform.isNative) {
      const { Share } = await import('@capacitor/share');
      await Share.share(options);
      return;
    }

    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share(options);
        return;
      } catch {
        /* annulé : on retombe sur la copie */
      }
    }

    if (options.url) {
      try {
        await navigator.clipboard.writeText(options.url);
      } catch {
        /* presse-papiers indisponible : on ignore */
      }
    }
  }
}
