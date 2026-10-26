import { Injectable, Inject, PLATFORM_ID, isDevMode } from '@angular/core';
import { HttpContextToken, HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Token } from '../services/Token/token';
import { Auth } from '../services/Auth/auth';
import { Notification } from '../services/Notification/notification';
import { Router } from '@angular/router';
import { describeError, formatDescribedError } from '../services/Errors/error-messages';

/**
 * Marque une requête DÉJÀ rejouée après un rafraîchissement de jeton.
 * Évite toute boucle 401 → refresh → 401 → refresh…
 * (HttpContextToken et non header : aucun impact CORS.)
 */
const REFRESH_RETRIED = new HttpContextToken<boolean>(() => false);

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isBrowser: boolean;

  // Routes publiques : jamais de token ; un 401 dessus ne déconnecte jamais.
  private readonly publicUrlPrefixes = [
    '/api/v1/public/',
    '/api/v1/payment/webhook',
  ];

  // Anti-spam par CODE d'erreur : un écran qui charge N widgets en parallèle
  // ne doit pas afficher N fois le même message.
  private lastNotice: { code: string; at: number } = { code: '', at: 0 };
  private readonly NOTICE_COOLDOWN_MS = 4000;

  constructor(
    private tokenService: Token,
    private authService: Auth,
    private router: Router,
    private notification: Notification,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  private isPublicUrl(url: string): boolean {
    return this.publicUrlPrefixes.some((prefix) => url.includes(prefix));
  }

  /**
   * Un 401 sur ces routes ne doit JAMAIS déclencher de rafraîchissement :
   * ce sont les routes qui établissent ou renouvellent la session.
   */
  private isAuthSessionUrl(url: string): boolean {
    return (
      url.includes('/api/v1/Auth/login') ||
      url.includes('/api/v1/Auth/refresh-token') ||
      url.includes('/api/v1/Auth/forgot-password') ||
      url.includes('/api/v1/Auth/validate-reset-token') ||
      url.includes('/api/v1/Auth/reset-password')
    );
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isBrowser) {
      return next.handle(request);
    }

    // ── Routes publiques ───────────────────────────────────────────────
    if (this.isPublicUrl(request.url)) {
      return next.handle(request).pipe(
        catchError((error: HttpErrorResponse) => {
          this.presentError(error, request.url);
          return throwError(() => error);
        })
      );
    }

    const token = this.tokenService.getToken();
    if (!token) {
      return next.handle(request);
    }

    // ⚠️ On n'appelle PLUS handleTokenExpired() ici : un token expiré doit
    // d'abord déclencher le rafraîchissement (single-flight) sur le 401.
    // Sinon l'actualisation de page après 30 min déconnectait l'utilisateur.

    const isFormData = request.body instanceof FormData;
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const clonedRequest = request.clone({ setHeaders: headers });

    return next.handle(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // 401 = token expiré ou invalide. On tente UN renouvellement
          // (single-flight), puis on rejoue la requête avec le nouveau token.
          const alreadyRetried = request.context.get(REFRESH_RETRIED);

          if (!alreadyRetried && !this.isAuthSessionUrl(request.url)) {
            this.log('Erreur 401 - tentative de rafraîchissement du token');

            return this.authService.refreshAccessToken().pipe(
              switchMap((newToken) => {
                const retried = request.clone({
                  setHeaders: { Authorization: `Bearer ${newToken}` },
                  context: request.context.set(REFRESH_RETRIED, true),
                });
                return next.handle(retried);
              }),
              catchError((refreshError) => {
                this.log('Rafraîchissement impossible - déconnexion');
                this.presentError(error, request.url);
                this.tokenService.handleTokenExpired();
                return throwError(() => refreshError);
              })
            );
          }

          // Pas de refresh possible (route de session, ou déjà rejouée).
          this.log('Erreur 401 - session expirée');
          this.presentError(error, request.url);
          this.tokenService.handleTokenExpired();
        } else {
          // 400/403/404/409/413/415/422/429/5xx/0 → message humain + action.
          this.presentError(error, request.url);
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Traduit ET affiche l'erreur (message français + action + référence).
   * Les erreurs de validation (champs) restent accessibles au formulaire via
   * `error.error.fields` ; le toast donne le contexte général.
   */
  private presentError(error: HttpErrorResponse, url: string): void {
    const described = describeError(error);

    const now = Date.now();
    if (this.lastNotice.code === described.code && now - this.lastNotice.at < this.NOTICE_COOLDOWN_MS) {
      return;
    }
    this.lastNotice = { code: described.code, at: now };

    this.log(`Erreur ${error.status} (${described.code}) sur`, url);

    const body = formatDescribedError(described);
    // 401/403/429 affichés en avertissement ; le reste en erreur.
    if (error.status === 401 || error.status === 403 || error.status === 429) {
      this.notification.warning(described.title, body);
    } else {
      this.notification.error(described.title, body);
    }
  }

  private log(...args: unknown[]): void {
    if (isDevMode()) console.log('[API]', ...args);
  }
}
