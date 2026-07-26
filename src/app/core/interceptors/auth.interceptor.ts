import { Injectable, Inject, PLATFORM_ID, isDevMode } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Token } from '../services/Token/token';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isBrowser: boolean;

  // ✅ NOUVEAU : préfixes de routes publiques — ne doivent jamais recevoir
  // de token, et un 401 dessus ne doit jamais déclencher une déconnexion
  // (elles sont [AllowAnonymous] côté backend et un visiteur non connecté
  // les utilise, mais un admin connecté peut aussi les visiter en test —
  // il ne faut pas le déconnecter pour ça).
  private readonly publicUrlPrefixes = [
    '/api/v1/public/',
    '/api/v1/payment/webhook',
  ];

  constructor(
    private tokenService: Token,
    private router: Router,
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

    // ✅ NOUVEAU : routes publiques — on ne touche pas à la requête,
    // et on ne déclenche jamais handleTokenExpired() sur un 401 ici.
    if (this.isPublicUrl(request.url)) {
      this.log('🌐 Interceptor: route publique, requête envoyée sans token à', request.url);
      return next.handle(request).pipe(
        catchError((error: HttpErrorResponse) => {
          this.log('⚠️ Interceptor: erreur sur route publique (aucune action de session)', error.status, request.url);
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
        if (error.status === 401) {
          this.log('⚠️ Interceptor: Erreur 401 - Token invalide ou expiré');
          this.tokenService.handleTokenExpired();
        }
        return throwError(() => error);
      })
    );
  }

  private log(...args: unknown[]): void {
    if (isDevMode()) {
      console.log(...args);
    }
  }
}
