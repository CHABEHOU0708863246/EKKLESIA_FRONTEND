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

  constructor(
    private tokenService: Token,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // ✅ Côté serveur, pas de token disponible : on transmet la requête telle quelle,
    // sans logs ni tentative de lecture du token (localStorage n'existe pas sur Node).
    if (!this.isBrowser) {
      return next.handle(request);
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

    const clonedRequest = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
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
