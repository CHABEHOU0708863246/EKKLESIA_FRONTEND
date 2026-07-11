// auth.interceptor.ts

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
    // ❌ Côté serveur, pas de token disponible
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

    // ✅ Vérifier si la requête contient un FormData
    const isFormData = request.body instanceof FormData;

    // ✅ Construire les headers sans forcer Content-Type pour FormData
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    // ✅ Ne pas définir Content-Type si c'est un FormData (le navigateur le fera)
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
