import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { routes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // ✅ Optimisation des performances
    provideZoneChangeDetection({ eventCoalescing: true }),

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
    }
  ]
};
