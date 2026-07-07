import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { isPlatformBrowser } from '@angular/common';
import { TokenData } from '../../models/Tolen/TokenData';
import { EkklesiaJwtPayload } from '../../models/Tolen/EkklesiaJwtPayload';

@Injectable({
  providedIn: 'root',
})
export class Token {
  private readonly STORAGE_KEY = 'ekklesia_auth_data';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly REMEMBER_ME_KEY = 'remember_me';
  private isBrowser: boolean;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    // ✅ Initialiser seulement dans le navigateur
    if (this.isBrowser) {
      this.preventBackNavigationAfterLogout();
    }
  }

  /**
   * CORRECTION CRITIQUE: Récupère l'ID utilisateur depuis le token
   */
  getUserId(): string | null {
    const payload = this.getPayload();

    if (!payload) {
      console.warn('⚠️ getUserId: Aucun payload disponible');
      return null;
    }

    // Essayer dans cet ordre de priorité :
    const userId =
      payload.userId ||
      (payload as any).id ||
      (payload as any)['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];

    if (!userId) {
      console.error('❌ User ID introuvable dans le token');
      console.log('📋 Payload complet:', JSON.stringify(payload, null, 2));
      return null;
    }

    console.log('✅ User ID récupéré:', userId);
    return userId;
  }

  /**
   * Sauvegarde les données d'authentification
   */
  saveToken(token: string, role: string, refreshToken?: string): void {
    if (!this.isBrowser) return;

    const data: TokenData = { token, role };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));

    if (refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }

    this.debugToken();
  }

  /**
   * Récupère le token brut pour les intercepteurs HTTP
   */
  getToken(): string | null {
    if (!this.isBrowser) return null;

    // 1️⃣ Vérifier dans ekklesia_auth_data
    const authData = localStorage.getItem(this.STORAGE_KEY);
    if (authData) {
      try {
        const parsedData: TokenData = JSON.parse(authData);
        if (parsedData.token) {
          return parsedData.token;
        }
      } catch (error) {
        console.error('❌ Erreur parsing authData:', error);
      }
    }

    // 2️⃣ Fallback sur l'ancien système
    const legacyToken = localStorage.getItem('token');
    if (legacyToken) {
      console.warn('⚠️ Utilisation du token legacy');
      return legacyToken;
    }

    return null;
  }

  /**
   * Récupère le refresh token
   */
  getRefreshToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Récupère le rôle stocké
   */
  getUserRole(): string | null {
    if (!this.isBrowser) return null;

    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) return null;

    try {
      const parsedData: TokenData = JSON.parse(data);
      return parsedData.role;
    } catch {
      return null;
    }
  }

  /**
   * Vérifie si l'utilisateur est connecté
   */
  isLogged(): boolean {
    if (!this.isBrowser) return false;

    const token = this.getToken();
    const isValid = !!token && !this.isTokenExpired();
    return isValid;
  }

  /**
   * Décode le token JWT (méthode manuelle)
   */
  decodeToken(token: string): any {
    if (!this.isBrowser) return null;

    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Erreur décodage token:', error);
      return null;
    }
  }

  /**
   * Décodage sécurisé du Payload avec jwtDecode
   */
  getPayload(): EkklesiaJwtPayload | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const payload = jwtDecode<EkklesiaJwtPayload>(token);
      return payload;
    } catch (error) {
      console.error('❌ Erreur décodage token:', error);
      return null;
    }
  }

  /**
   * Vérifie si le token est expiré
   */
  isTokenExpired(): boolean {
    const payload = this.getPayload();
    if (!payload || !payload.exp) {
      console.warn('⚠️ Payload invalide ou pas d\'expiration');
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp < currentTime;

    if (isExpired) {
      console.warn('⚠️ Token expiré:', {
        exp: new Date(payload.exp * 1000).toLocaleString(),
        now: new Date(currentTime * 1000).toLocaleString()
      });
    }

    return isExpired;
  }

  /**
   * Déconnexion complète
   */
  logout(): void {
    if (!this.isBrowser) return;

    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.REMEMBER_ME_KEY);
    localStorage.removeItem('token');
    sessionStorage.clear();

    this.blockBackNavigation();

    this.router.navigate(['/auth/login'], {
      replaceUrl: true
    });
  }

  /**
   * Gère l'expiration automatique du token
   */
  handleTokenExpired(): void {
    if (!this.isBrowser) return;

    console.warn('⚠️ Token expiré - Déconnexion automatique');

    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem('token');
    sessionStorage.clear();

    this.router.navigate(['/auth/login'], {
      queryParams: { expired: true },
      replaceUrl: true
    });
  }

  /**
   * Empêche la navigation arrière après déconnexion
   */
  private blockBackNavigation(): void {
    if (!this.isBrowser) return;

    window.history.pushState(null, '', window.location.href);

    window.onpopstate = () => {
      if (!this.isLogged()) {
        window.history.pushState(null, '', window.location.href);
        this.router.navigate(['/auth/login'], { replaceUrl: true });
      }
    };
  }

  /**
   * Protection globale contre le retour arrière
   */
  private preventBackNavigationAfterLogout(): void {
    if (!this.isBrowser) return;

    window.addEventListener('popstate', (event) => {
      if (!this.isLogged()) {
        const currentPath = window.location.pathname;

        if (!currentPath.includes('/auth/')) {
          console.warn('⚠️ Tentative retour arrière sans auth');
          event.preventDefault();
          this.router.navigate(['/auth/login'], { replaceUrl: true });
        }
      }
    });
  }

  /**
   * Vérifier si le token expire bientôt
   */
  isTokenExpiringSoon(): boolean {
    const payload = this.getPayload();
    if (!payload || !payload.exp) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    const fiveMinutes = 5 * 60;

    return (payload.exp - currentTime) < fiveMinutes;
  }

  /**
   * Obtenir le temps restant avant expiration
   */
  getTimeUntilExpiration(): number {
    const payload = this.getPayload();
    if (!payload || !payload.exp) return 0;

    const currentTime = Math.floor(Date.now() / 1000);
    return Math.max(0, payload.exp - currentTime);
  }

  /**
   * Valider le token avant une requête importante
   */
  validateToken(): boolean {
    if (!this.isBrowser) return false;

    if (!this.isLogged()) {
      console.warn('⚠️ Token invalide ou expiré');
      this.handleTokenExpired();
      return false;
    }
    return true;
  }

  /**
   * DEBUG: Affiche le contenu complet du token
   */
  debugToken(): void {
    if (!this.isBrowser) return;

    const token = this.getToken();
    if (!token) {
      return;
    }

    const payload = this.getPayload();
    if (!payload) {
      return;
    }
  }
}
