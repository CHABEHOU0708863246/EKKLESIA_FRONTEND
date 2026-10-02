import { Injectable, inject } from '@angular/core';
import { PlatformService } from './platform.service';

/**
 * Événements applicatifs natifs (Capacitor App) :
 *  - bouton « retour » matériel Android ;
 *  - reprise/veille (resume/pause) — utile pour rafraîchir des données.
 * Sur le web : no-op total.
 */
@Injectable({ providedIn: 'root' })
export class NativeAppEventsService {
  private readonly platform = inject(PlatformService);

  /** Branche le bouton retour Android. `canGoBack` géré par Capacitor. */
  async registerBackButton(onExit: () => void): Promise<void> {
    if (!this.platform.isNative) return;
    const { App } = await import('@capacitor/app');
    await App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        onExit();
      }
    });
  }

  /** Notifie quand l'app revient au premier plan (web : visibilitychange). */
  onResume(callback: () => void): (() => void) | undefined {
    if (!this.platform.isBrowser) return;
    if (this.platform.isNative) {
      let remove: (() => void) | undefined;
      import('@capacitor/app').then(({ App }) => {
        App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) callback();
        }).then((h) => (remove = () => h.remove()));
      });
      return () => remove?.();
    }
    const handler = () => {
      if (document.visibilityState === 'visible') callback();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }
}
