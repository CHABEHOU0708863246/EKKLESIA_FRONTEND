import { HttpClient } from '@angular/common/http';
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { EMPTY, Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LoginRequest } from '../../models/Login/LoginRequest';
import { LoginResponse } from '../../models/Login/LoginResponse';
import { ChangePasswordRequest } from '../../models/Password/ChangePasswordRequest';
import { ForgotPasswordRequest } from '../../models/Password/ForgotPasswordRequest';
import { ResetPasswordRequest } from '../../models/Password/ResetPasswordRequest';
import { User } from '../../models/Users/user.model';
import { RefreshTokenRequest } from '../../models/Tolen/RefreshTokenRequest';
import { ValidateResetTokenRequest } from '../../models/Tolen/ValidateResetTokenRequest';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/Auth`;
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  /**
   * Authentifie un utilisateur et génère un token JWT
   */
  authenticate(loginRequest: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, loginRequest)
      .pipe(catchError(this.handleError));
  }

  /**
   * Déconnexion
   */
  logout(): Observable<Response> {
    return this.http.post<Response>(`${this.baseUrl}/logout`, {})
      .pipe(catchError(this.handleError));
  }

  /**
   * Rafraîchir le token
   */
  refreshToken(refreshTokenRequest: RefreshTokenRequest): Observable<RefreshTokenRequest> {
    return this.http.post<RefreshTokenRequest>(`${this.baseUrl}/refresh-token`, refreshTokenRequest)
      .pipe(catchError(this.handleError));
  }

  /**
   * Mot de passe oublié
   */
  forgotPassword(forgotPasswordRequest: ForgotPasswordRequest): Observable<Response> {
    return this.http.post<Response>(
      `${this.baseUrl}/forgot-password`,
      forgotPasswordRequest
    ).pipe(catchError(this.handleError));
  }

  /**
   * Valider un token de réinitialisation
   */
  validateResetToken(validateRequest: ValidateResetTokenRequest): Observable<Response> {
    const decodedRequest = {
      email: validateRequest.email,
      token: encodeURIComponent(validateRequest.token)
    };

    return this.http.post<Response>(`${this.baseUrl}/validate-reset-token`, decodedRequest)
      .pipe(catchError(this.handleError));
  }

  /**
   * Réinitialiser le mot de passe
   */
  resetPassword(resetPasswordRequest: ResetPasswordRequest): Observable<Response> {
    return this.http.post<Response>(`${this.baseUrl}/reset-password`, resetPasswordRequest)
      .pipe(catchError(this.handleError));
  }

  /**
   * Changer le mot de passe (utilisateur connecté)
   */
  changePassword(changePasswordRequest: ChangePasswordRequest): Observable<Response> {
    return this.http.post<Response>(`${this.baseUrl}/change-password`, changePasswordRequest)
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtenir les informations de l'utilisateur connecté
   * ✅ Ne fait pas l'appel côté serveur (pas de token disponible pendant le SSR)
   */
  getCurrentUser(): Observable<User> {
  if (!this.isBrowser) {
    return EMPTY; // ✅ Ne rien émettre, pas d'erreur, silencieux côté SSR
  }

  return this.http.get<User>(`${this.baseUrl}/me`, {
    headers: this.getAuthHeaders()
  }).pipe(catchError(this.handleError));
}

  /**
   * Vérifier si l'utilisateur est authentifié
   * ✅ Ne fait pas l'appel côté serveur
   */
  checkAuth(): Observable<Response> {
    if (!this.isBrowser) {
      return throwError(() => new Error('SSR: checkAuth ignoré côté serveur'));
    }

    return this.http.get<Response>(`${this.baseUrl}/check-auth`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  /**
   * Obtenir les headers d'authentification
   * ✅ Ne touche localStorage que côté navigateur
   */
  private getAuthHeaders(): { [header: string]: string } {
    const token = this.isBrowser ? localStorage.getItem('token') : null;
    return {
      'Authorization': `Bearer ${token || ''}`
    };
  }

  /**
   * Gestion centralisée des erreurs
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'Une erreur est survenue';

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      switch (error.status) {
        case 400:
          errorMessage = error.error?.message || 'Données invalides';
          break;
        case 401:
          errorMessage = 'Non autorisé. Veuillez vous reconnecter.';
          break;
        case 403:
          errorMessage = 'Accès refusé';
          break;
        case 404:
          errorMessage = 'Ressource non trouvée';
          break;
        case 500:
          errorMessage = 'Erreur serveur interne';
          break;
        default:
          errorMessage = `Erreur ${error.status}: ${error.message}`;
      }
    }

    console.error('AuthService error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
