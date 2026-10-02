import { Injectable, inject } from '@angular/core';
import { PlatformService } from './platform.service';

/**
 * Ouverture de liens externes (portail de paiement GeniusPay, pages légales…).
 * Natif : navigateur système via @capacitor/browser. Web : nouvel onglet.
 */
@Injectable({ providedIn: 'root' })
export class NativeBrowserService {
  private readonly platform = inject(PlatformService);

  async open(url: string): Promise<void> {
    if (this.platform.isNative) {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
      return;
    }
    window.open(url, '_blank', 'noopener');
  }
}
