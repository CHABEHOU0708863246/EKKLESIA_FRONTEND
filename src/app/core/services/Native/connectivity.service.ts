import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { PlatformService } from './platform.service';

/**
 * État de connexion réseau, observable via un signal.
 * Natif : @capacitor/network. Web : événements online/offline du navigateur.
 * Utile pour afficher un bandeau « pas de connexion » et bloquer les actions.
 */
@Injectable({ providedIn: 'root' })
export class ConnectivityService implements OnDestroy {
  private readonly platform = inject(PlatformService);

  /** Vrai quand l'appareil est connecté. */
  readonly online = signal(true);

  private removeListener?: () => void;

  constructor() {
    if (!this.platform.isBrowser) return;

    if (this.platform.isNative) {
      this.initNative();
    } else {
      this.initWeb();
    }
  }

  private async initNative(): Promise<void> {
    const { Network } = await import('@capacitor/network');
    const status = await Network.getStatus();
    this.online.set(status.connected);
    const handle = await Network.addListener('networkStatusChange', (s) => this.online.set(s.connected));
    this.removeListener = () => handle.remove();
  }

  private initWeb(): void {
    const update = () => this.online.set(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    this.removeListener = () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }

  ngOnDestroy(): void {
    this.removeListener?.();
  }
}
