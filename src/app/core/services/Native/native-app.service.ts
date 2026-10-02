import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Capacitor } from '@capacitor/core';

/**
 * Réglages natifs (Capacitor) de l'application mobile :
 *  - barre de statut (couleur, style) ;
 *  - masquage de l'écran de démarrage (splash) une fois l'app prête.
 *
 * Ne fait RIEN sur le web (navigateur) ni en SSR : les appels natifs sont
 * entièrement conditionnés par `Capacitor.isNativePlatform()`.
 */
@Injectable({ providedIn: 'root' })
export class NativeAppService {
  private readonly platformId = inject(PLATFORM_ID);
  private initialized = false;

  /** À appeler une seule fois au démarrage de l'application. */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (!isPlatformBrowser(this.platformId)) return;
    if (!Capacitor.isNativePlatform()) return; // web : rien à faire

    this.initialized = true;

    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      // Barre de statut claire, cohérente avec l'écran de démarrage MIAV.
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
      await StatusBar.setStyle({ style: Style.Light });
    } catch {
      /* plugin indisponible : on ignore */
    }

    try {
      const { SplashScreen } = await import('@capacitor/splash-screen');
      // Masque le splash natif : l'écran de démarrage HTML (index.html) prend
      // le relais et évite tout flash blanc pendant le chargement d'Angular.
      await SplashScreen.hide();
    } catch {
      /* plugin indisponible : on ignore */
    }
  }
}
