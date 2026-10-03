import { ApplicationConfig, provideZoneChangeDetection, isDevMode, inject, provideAppInitializer, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { routes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { provideServiceWorker } from '@angular/service-worker';
import { Permissions } from './core/services/Permissions/permissions';
import { Token } from './core/services/Token/token';
import { NativeAppService } from './core/services/Native/native-app.service';

/**
 * Détection de l'app native (Capacitor) SANS import lourd, sûr en SSR.
 * L'app mobile sert ses fichiers localement : le Service Worker y est inutile
 * et source de ralentissements (mise en cache/rechargements), on le désactive.
 */
function isNativeApp(): boolean {
  return typeof window !== 'undefined'
    && (window as any).Capacitor?.isNativePlatform?.() === true;
}

export const appConfig: ApplicationConfig = {
  providers: [
    // ✅ Optimisation des performances
    provideZoneChangeDetection({ eventCoalescing: true }),

    // ✅ Charge les permissions EFFECTIVES (source de vérité serveur).
    // Le JWT porte DÉJÀ les rôles et permissions (chargés en synchrone par le
    // constructeur de Permissions). On ne bloque donc PAS le démarrage sur le
    // réseau : l'app s'affiche immédiatement, et le rafraîchissement serveur
    // s'exécute en arrière-plan (borné par un timeout) pour confirmer les droits.
    provideAppInitializer(() => {
      const platformId = inject(PLATFORM_ID);
      if (!isPlatformBrowser(platformId)) return;

      const permissions = inject(Permissions);
      const token = inject(Token);

      if (token.isLogged() && !token.isTokenExpired()) {
        void permissions.refreshFromServer();
      }

      return;
    }),

    // ✅ Réglages natifs mobile (Capacitor) : barre de statut + splash.
    // Sans effet sur le web/SSR (le service se garde lui-même).
    provideAppInitializer(() => {
      const nativeApp = inject(NativeAppService);
      return nativeApp.initialize();
    }),

    // ✅ Routage
    provideRouter(routes),

    // ✅ Hydratation SSR — SANS `withEventReplay()` : le rejeu d'événements
    // bufferise les clics jusqu'à la fin de l'hydratation, ce qui donnait une
    // impression de « boutons figés » (notamment l'ouverture du menu sur mobile).
    provideClientHydration(),

    // ✅ HttpClient avec fetch et support des intercepteurs DI
    provideHttpClient(
      withFetch(),              // Utiliser fetch API pour de meilleures performances
      withInterceptorsFromDi()  // Permettre l'utilisation des intercepteurs via DI
    ),

    // ✅ Enregistrement de l'intercepteur d'authentification
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },

    // ✅ Service Worker : WEB uniquement. Désactivé dans l'app native (Capacitor)
    // où il provoquait de gros ralentissements (registerWhenStable:30000 =
    // jusqu'à 30 s d'attente + rechargements de page).
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode() && !isNativeApp(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
