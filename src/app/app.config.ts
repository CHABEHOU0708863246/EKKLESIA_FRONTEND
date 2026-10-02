import { ApplicationConfig, provideZoneChangeDetection, isDevMode, inject, provideAppInitializer, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { routes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { provideServiceWorker } from '@angular/service-worker';
import { Permissions } from './core/services/Permissions/permissions';
import { Token } from './core/services/Token/token';
import { NativeAppService } from './core/services/Native/native-app.service';

export const appConfig: ApplicationConfig = {
  providers: [
    // ✅ Optimisation des performances
    provideZoneChangeDetection({ eventCoalescing: true }),

    // ✅ Charge les permissions EFFECTIVES (source de vérité serveur) avant
    // d'évaluer le premier guard. Évite qu'un utilisateur (ex. Pasteur de Site)
    // soit bloqué à tort parce que ses droits n'étaient pas encore chargés.
    provideAppInitializer(() => {
      const platformId = inject(PLATFORM_ID);
      if (!isPlatformBrowser(platformId)) return;

      const permissions = inject(Permissions);
      const token = inject(Token);

      // Le JWT porte DÉJÀ les rôles et permissions (chargés en synchrone par le
      // constructeur de Permissions). On ne bloque donc PAS le démarrage sur le
      // réseau : l'app s'affiche immédiatement, et le rafraîchissement serveur
      // s'exécute en arrière-plan (borné par un timeout) pour confirmer les droits.
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

    // ✅ Hydratation pour SSR
    provideClientHydration(withEventReplay()),

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
    }, provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          })
  ]
};
