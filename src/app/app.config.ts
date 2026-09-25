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

      if (token.isLogged() && !token.isTokenExpired()) {
        return permissions.refreshFromServer();
      }

      return;
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
