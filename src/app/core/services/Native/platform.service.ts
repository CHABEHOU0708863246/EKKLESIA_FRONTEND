import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Capacitor } from '@capacitor/core';

/**
 * Détection de la plateforme d'exécution. Point unique pour savoir si l'on
 * tourne dans l'app mobile native (Capacitor) ou dans un navigateur.
 * Permet à tous les services natifs de brancher un fallback web propre.
 */
@Injectable({ providedIn: 'root' })
export class PlatformService {
  private readonly platformId = inject(PLATFORM_ID);

  /** Vrai si l'on tourne dans un navigateur (web ou SSR hydraté). */
  get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  /** Vrai si l'on tourne dans l'app native (Android/iOS). */
  get isNative(): boolean {
    return this.isBrowser && Capacitor.isNativePlatform();
  }

  /** Plateforme native : 'android' | 'ios' | 'web'. */
  get platform(): string {
    return this.isBrowser ? Capacitor.getPlatform() : 'web';
  }
}
