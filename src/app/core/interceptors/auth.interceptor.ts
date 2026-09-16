import { Injectable, Inject, PLATFORM_ID, isDevMode } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Token } from '../services/Token/token';
import { Notification } from '../services/Notification/notification';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isBrowser: boolean;

  // ✅ Routes publiques — ne doivent jamais recevoir de token, et un 401 dessus
  // ne doit jamais déclencher une déconnexion (elles sont [AllowAnonymous] côté
  // backend et un visiteur non connecté les utilise, mais un admin connecté
  // peut aussi les visiter en test — il ne faut pas le déconnecter pour ça).
  private readonly publicUrlPrefixes = [
    '/api/v1/public/',
    '/api/v1/payment/webhook',
  ];

  // ⚠️ Anti-spam des notifications d'erreur : un écran qui charge N widgets en
  // parallèle déclencherait N toasts identiques. On mémorise la dernière
  // notification par statut pendant quelques secondes.
  private lastNotice: { status: number; at: number } = { status: 0, at: 0 };
  private readonly NOTICE_COOLDOWN_MS = 4000;

  constructor(
    private tokenService: Token,
    private router: Router,
    private notification: Notification,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  private isPublicUrl(url: string): boolean {
    return this.publicUrlPrefixes.some((prefix) => url.includes(prefix));
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // ❌ Côté serveur, pas de token disponible
    if (!this.isBrowser) {
      return next.handle(request);
    }

    // ✅ Routes publiques — on ne touche pas à la requête, et on ne déclenche
    // jamais handleTokenExpired() sur un 401 ici.
    if (this.isPublicUrl(request.url)) {
      this.log('🌐 Interceptor: route publique, requête envoyée sans token à', request.url);
      return next.handle(request).pipe(
        catchError((error: HttpErrorResponse) => {
          this.log('⚠️ Interceptor: erreur sur route publique (aucune action de session)', error.status, request.url);
          this.notifyTransientError(error);
          return throwError(() => error);
        })
      );
    }

    const token = this.tokenService.getToken();
    if (!token) {
      this.log('❌ Interceptor: Aucun token trouvé pour', request.url);
      return next.handle(request);
    }

    if (this.tokenService.isTokenExpired()) {
      this.log('⚠️ Interceptor: Token expiré - Déconnexion');
      this.tokenService.handleTokenExpired();
      return throwError(() => new Error('Token expiré'));
    }

    const isFormData = request.body instanceof FormData;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const clonedRequest = request.clone({
      setHeaders: headers,
    });

    this.log('✅ Interceptor: Requête avec token envoyée à:', request.url);
    return next.handle(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        switch (error.status) {
          case 401:
            // 401 = non authentifié (token absent/expiré/invalide) → re-login.
            this.log('⚠️ Interceptor: Erreur 401 - Token invalide ou expiré');
            this.tokenService.handleTokenExpired();
            break;
          case 403:
            // 403 = authentifié mais permission manquante. On NE déconnecte PAS :
            // l'utilisateur reste connecté, on l'informe simplement.
            this.log('⚠️ Interceptor: Erreur 403 - Permission manquante sur', request.url);
            this.notifyTransientError(error, {
              title: 'Accès refusé',
              message:
                "Vous n'avez pas la permission nécessaire pour cette action. Contactez un administrateur si besoin.",
            });
            break;
          case 429:
            // 429 = rate limiting (10 req/min sur l'auth, 300/min global).
            this.log('⚠️ Interceptor: Erreur 429 - Trop de requêtes');
            this.notifyTransientError(error, {
              title: 'Trop de requêtes',
              message: this.buildRateLimitMessage(error),
            });
            break;
          default:
            break;
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Affiche un toast unique par statut pendant le délai de cooldown.
   */
  private notifyTransientError(
    error: HttpErrorResponse,
    override?: { title: string; message: string }
  ): void {
    const now = Date.now();
    if (this.lastNotice.status === error.status && now - this.lastNotice.at < this.NOTICE_COOLDOWN_MS) {
      return;
    }
    this.lastNotice = { status: error.status, at: now };

    if (error.status === 429) {
      this.notification.warning(
        override?.title ?? 'Trop de requêtes',
        override?.message ?? this.buildRateLimitMessage(error)
      );
      return;
    }

    if (error.status === 403) {
      this.notification.warning(
        override?.title ?? 'Accès refusé',
        override?.message ?? "Vous n'avez pas la permission nécessaire pour cette action."
      );
    }
  }

  private buildRateLimitMessage(error: HttpErrorResponse): string {
    const retryAfter = error.headers?.get('Retry-After');
    const seconds = retryAfter ? Number(retryAfter) : NaN;
    if (!Number.isNaN(seconds) && seconds > 0) {
      return `Trop de tentatives. Merci de patienter ${Math.ceil(seconds)} seconde(s) avant de réessayer.`;
    }
    return 'Trop de requêtes envoyées. Merci de patienter quelques instants avant de réessayer.';
  }

  private log(...args: unknown[]): void {
    if (isDevMode()) {
      console.log(...args);
    }
  }
}
