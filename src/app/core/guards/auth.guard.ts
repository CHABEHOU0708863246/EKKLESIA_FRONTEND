import { inject, isDevMode, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Token } from '../services/Token/token';
import { Permissions } from '../services/Permissions/permissions';

/**
 * Log conditionnel : actif uniquement en développement, pour ne pas polluer
 * la console en production.
 */
function log(...args: unknown[]): void {
  if (isDevMode()) {
    console.log(...args);
  }
}



/**
 * Vérifie l'authentification (token présent + non expiré).
 * Retourne `true` si OK, ou l'UrlTree de redirection vers login sinon.
 * Ne redirige jamais côté serveur (SSR) : le token n'y est de toute façon
 * pas accessible, donc on laisse passer et le client re-vérifiera après
 * hydratation.
 */
function checkAuthenticated(
  tokenService: Token,
  router: Router,
  guardName: string
): true | UrlTree {
  const isLogged = tokenService.isLogged();
  const isExpired = tokenService.isTokenExpired();

  log(`📊 ${guardName}: isLogged =`, isLogged, 'isExpired =', isExpired);

  if (!isLogged || isExpired) {
    log(`❌ ${guardName}: Token invalide ou expiré - Redirection vers login`);
    tokenService.clearSession();
    return router.createUrlTree(['/auth/login']);
  }

  log(`✅ ${guardName}: Utilisateur authentifié`);
  return true;
}

/**
 * `authGuard` : Garde complète — authentification + permissions/rôles optionnels
 * définis via `route.data`.
 */
export const authGuard: CanActivateFn = (route) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return true;

  const tokenService = inject(Token);
  const permissions = inject(Permissions);
  const router = inject(Router);

  log("🔍 AuthGuard: Vérification de l'authentification...");

  const authResult = checkAuthenticated(tokenService, router, 'AuthGuard');
  if (authResult !== true) return authResult;

  const requiredPermissions = (route.data?.['permissions'] as string[]) ?? [];
  const requiredRoles = (route.data?.['roles'] as string[]) ?? [];

  log('📋 AuthGuard: Permissions requises:', requiredPermissions);
  log('📋 AuthGuard: Rôles requis:', requiredRoles);

  if (requiredPermissions.length > 0 && !permissions.hasAnyPermission(...requiredPermissions)) {
    log('❌ AuthGuard: Permissions manquantes - Redirection vers dashboard');
    return router.createUrlTree(['/dashboard']);
  }

  if (requiredRoles.length > 0 && !permissions.hasAnyRole(...requiredRoles)) {
    log('❌ AuthGuard: Rôles manquants - Redirection vers dashboard');
    return router.createUrlTree(['/dashboard']);
  }

  log('✅ AuthGuard: Toutes les conditions vérifiées');
  return true;
};

/**
 * Garde légère : authentification uniquement, sans vérification de permissions/rôles.
 */
export const simpleAuthGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return true;

  const tokenService = inject(Token);
  const router = inject(Router);

  log("🔍 SimpleAuthGuard: Vérification de l'authentification...");
  return checkAuthenticated(tokenService, router, 'SimpleAuthGuard');
};

/**
 * Garde pour la page de login — empêche l'accès si déjà connecté.
 */
export const loginGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return true;

  const tokenService = inject(Token);
  const router = inject(Router);

  log("🔍 LoginGuard: Vérification de l'authentification...");

  const isLogged = tokenService.isLogged();
  const isExpired = tokenService.isTokenExpired();

  if (isLogged && !isExpired) {
    log('✅ LoginGuard: Utilisateur déjà connecté - Redirection vers dashboard');
    return router.createUrlTree(['/dashboard']);
  }

  log('✅ LoginGuard: Accès à la page de login autorisé');
  return true;
};

/**
 * Garde pour vérifier uniquement les permissions (authentification incluse).
 */
export const permissionGuard: CanActivateFn = (route) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return true;

  const tokenService = inject(Token);
  const permissions = inject(Permissions);
  const router = inject(Router);

  const authResult = checkAuthenticated(tokenService, router, 'PermissionGuard');
  if (authResult !== true) return authResult;

  const requiredPermissions = (route.data?.['permissions'] as string[]) ?? [];

  if (requiredPermissions.length === 0) {
    log('✅ PermissionGuard: Aucune permission requise');
    return true;
  }

  if (!permissions.hasAnyPermission(...requiredPermissions)) {
    log(`❌ PermissionGuard: Permissions manquantes (${requiredPermissions.join(', ')})`);
    return router.createUrlTree(['/dashboard']);
  }

  log('✅ PermissionGuard: Permissions vérifiées avec succès');
  return true;
};

/**
 * Garde pour vérifier uniquement les rôles (authentification incluse).
 */
export const roleGuard: CanActivateFn = (route) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return true;

  const tokenService = inject(Token);
  const permissions = inject(Permissions);
  const router = inject(Router);

  const authResult = checkAuthenticated(tokenService, router, 'RoleGuard');
  if (authResult !== true) return authResult;

  const requiredRoles = (route.data?.['roles'] as string[]) ?? [];

  if (requiredRoles.length === 0) {
    log('✅ RoleGuard: Aucun rôle requis');
    return true;
  }

  if (!permissions.hasAnyRole(...requiredRoles)) {
    log(`❌ RoleGuard: Rôles manquants (${requiredRoles.join(', ')})`);
    return router.createUrlTree(['/dashboard']);
  }

  log('✅ RoleGuard: Rôles vérifiés avec succès');
  return true;
};

/**
 * Garde réservée aux Super Admins.
 */
export const superAdminGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return true;

  const tokenService = inject(Token);
  const permissions = inject(Permissions);
  const router = inject(Router);

  const authResult = checkAuthenticated(tokenService, router, 'SuperAdminGuard');
  if (authResult !== true) return authResult;

  if (!permissions.isSuperAdmin()) {
    log('❌ SuperAdminGuard: Accès réservé aux Super Admins');
    return router.createUrlTree(['/dashboard']);
  }

  log('✅ SuperAdminGuard: Super Admin vérifié');
  return true;
};

/**
 * Garde réservée aux pasteurs et rôles supérieurs.
 */
export const pastorGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return true;

  const tokenService = inject(Token);
  const permissions = inject(Permissions);
  const router = inject(Router);

  const authResult = checkAuthenticated(tokenService, router, 'PastorGuard');
  if (authResult !== true) return authResult;

  if (!permissions.isAdminOrAbove()) {
    log('❌ PastorGuard: Accès réservé aux pasteurs');
    return router.createUrlTree(['/dashboard']);
  }

  log('✅ PastorGuard: Pasteur vérifié');
  return true;
};

/**
 * Garde combinée — vérifie authentification, Super Admin, Admin,
 * permissions et rôles selon les données de la route.
 */
export const combinedGuard: CanActivateFn = (route) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return true;

  const tokenService = inject(Token);
  const permissions = inject(Permissions);
  const router = inject(Router);

  const authResult = checkAuthenticated(tokenService, router, 'CombinedGuard');
  if (authResult !== true) return authResult;

  const requiredPermissions = (route.data?.['permissions'] as string[]) ?? [];
  const requiredRoles = (route.data?.['roles'] as string[]) ?? [];
  const requireSuperAdmin = (route.data?.['superAdmin'] as boolean) ?? false;
  const requireAdmin = (route.data?.['admin'] as boolean) ?? false;

  if (requireSuperAdmin && !permissions.isSuperAdmin()) {
    log('❌ CombinedGuard: Super Admin requis');
    return router.createUrlTree(['/dashboard']);
  }

  if (requireAdmin && !permissions.isAdminOrAbove()) {
    log('❌ CombinedGuard: Admin requis');
    return router.createUrlTree(['/dashboard']);
  }

  if (requiredPermissions.length > 0 && !permissions.hasAnyPermission(...requiredPermissions)) {
    log(`❌ CombinedGuard: Permissions manquantes (${requiredPermissions.join(', ')})`);
    return router.createUrlTree(['/dashboard']);
  }

  if (requiredRoles.length > 0 && !permissions.hasAnyRole(...requiredRoles)) {
    log(`❌ CombinedGuard: Rôles manquants (${requiredRoles.join(', ')})`);
    return router.createUrlTree(['/dashboard']);
  }

  log('✅ CombinedGuard: Toutes les conditions vérifiées');
  return true;
};
