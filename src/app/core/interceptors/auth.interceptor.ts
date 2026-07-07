import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Token } from '../services/Token/token';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private tokenService: Token,
    private router: Router
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Récupère le jeton d'authentification depuis le service
    const token = this.tokenService.getToken();

    let clonedRequest = request;

    // Si un jeton est disponible, clone la requête et ajoute l'en-tête Authorization
    if (token) {
      console.log('🔑 Interceptor: Token présent:', token.substring(0, 20) + '...');

      // ✅ Vérifier que le token n'est pas expiré avant de l'envoyer
      if (this.tokenService.isTokenExpired()) {
        console.warn('⚠️ Interceptor: Token expiré - Déconnexion');
        this.tokenService.handleTokenExpired();
        // Rediriger vers login
        this.router.navigate(['/auth/login']);
        return throwError(() => new Error('Token expiré'));
      }

      clonedRequest = request.clone({
        setHeaders: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Interceptor: Requête avec token envoyée à:', request.url);
    } else {
      console.log('❌ Interceptor: Aucun token trouvé');
    }

    // Passe la requête au prochain gestionnaire avec gestion d'erreur
    return next.handle(clonedRequest).pipe(
      catchError((error) => {
        // Si erreur 401, rediriger vers login
        if (error.status === 401) {
          console.warn('⚠️ Interceptor: Erreur 401 - Token invalide ou expiré');
          this.tokenService.logout();
          this.router.navigate(['/auth/login']);
        }
        return throwError(() => error);
      })
    );
  }
}
