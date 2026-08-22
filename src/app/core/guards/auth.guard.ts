
import { inject, isDevMode, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router, UrlTree, ActivatedRouteSnapshot } from '@angular/router';
import { Token } from '../services/Token/token';
import { Permissions } from '../services/Permissions/permissions';

/**
 * Log conditionnel : actif uniquement en développement.
 */
function log(...args: unknown[]): void {
  if (isDevMode()) {
    console.log(...args);
  }
}

/**
 * ✅ CORRIGÉ — route neutre, sans aucune garde de permission, pour éviter les
 * boucles de redirection infinies quand un utilisateur authentifié n'a pas
 * même accès au dashboard.
 */
const UNAUTHORIZED_ROUTE = ['/unauthorized'];
const LOGIN_ROUTE = ['/auth/login'];

/**
 * Vérifie l'authentification. Retourne `true` si OK, ou l'UrlTree de
 * redirection vers login sinon (avec ?returnUrl= pour revenir après login).
 */
function checkAuthenticated(
  tokenService: Token,
  router: Router,
  route: ActivatedRouteSnapshot,
  guardName: string
): true | UrlTree {
  const isLogged = tokenService.isLogged();
  const isExpired = tokenService.isTokenExpired();

  log(`📊 ${guardName}: isLogged =`, isLogged, 'isExpired =', isExpired);

  if (!isLogged || isExpired) {
    log(`❌ ${guardName}: Token invalide ou expiré - Redirection vers login`);
    tokenService.clearSession();
    return router.createUrlTree(LOGIN_ROUTE, {
      queryParams: { returnUrl: route.url.map(s => s.path).join('/') || undefined },
    });
  }

  return true;
}

/**
 * ✅ CORRIGÉ — un seul guard, paramétrable via route.data, qui remplace
 * authGuard / permissionGuard / roleGuard / superAdminGuard / pastorGuard /
 * combinedGuard. Les anciens noms sont conservés plus bas comme des alias
 * fins pour ne pas casser les définitions de routes existantes — à migrer
 * progressivement vers `accessGuard` puis à supprimer.
 *
 * route.data supporté :
 *  - permissions?: string[]   -> au moins une requise (OR)
 *  - allPermissions?: string[] -> toutes requises (AND)
 *  - roles?: string[]         -> au moins un requis (OR)
 *  - superAdmin?: boolean
 *  - admin?: boolean          -> "admin ou plus" (SUPER_ADMIN, PASTOR_PRINCIPAL, PASTEUR_SITE)
 */
export const accessGuard: CanActivateFn = (route) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return true;

  const tokenService = inject(Token);
  const permissions = inject(Permissions);
  const router = inject(Router);

  const authResult = checkAuthenticated(tokenService, router, route, 'AccessGuard');
  if (authResult !== true) return authResult;

  const requiredPermissions = (route.data?.['permissions'] as string[]) ?? [];
  const requiredAllPermissions = (route.data?.['allPermissions'] as string[]) ?? [];
  const requiredRoles = (route.data?.['roles'] as string[]) ?? [];
  const requireSuperAdmin = (route.data?.['superAdmin'] as boolean) ?? false;
  const requireAdmin = (route.data?.['admin'] as boolean) ?? false;

  if (requireSuperAdmin && !permissions.isSuperAdmin()) {
    log('❌ AccessGuard: Super Admin requis');
    return router.createUrlTree(UNAUTHORIZED_ROUTE);
  }

  if (requireAdmin && !permissions.isAdminOrAbove()) {
    log('❌ AccessGuard: Admin requis');
    return router.createUrlTree(UNAUTHORIZED_ROUTE);
  }

  if (requiredPermissions.length > 0 && !permissions.hasAnyPermission(...requiredPermissions)) {
    log(`❌ AccessGuard: Permissions manquantes (${requiredPermissions.join(', ')})`);
    return router.createUrlTree(UNAUTHORIZED_ROUTE);
  }

  if (requiredAllPermissions.length > 0 && !permissions.hasAllPermissions(...requiredAllPermissions)) {
    log(`❌ AccessGuard: Permissions (toutes requises) manquantes (${requiredAllPermissions.join(', ')})`);
    return router.createUrlTree(UNAUTHORIZED_ROUTE);
  }

  if (requiredRoles.length > 0 && !permissions.hasAnyRole(...requiredRoles)) {
    log(`❌ AccessGuard: Rôles manquants (${requiredRoles.join(', ')})`);
    return router.createUrlTree(UNAUTHORIZED_ROUTE);
  }

  log('✅ AccessGuard: Toutes les conditions vérifiées');
  return true;
};

/**
 * Garde légère : authentification uniquement.
 */
export const simpleAuthGuard: CanActivateFn = (route) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return true;

  const tokenService = inject(Token);
  const router = inject(Router);

  return checkAuthenticated(tokenService, router, route, 'SimpleAuthGuard');
};

/**
 * Garde pour la page de login — empêche l'accès si déjà connecté.
 */
export const loginGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return true;

  const tokenService = inject(Token);
  const router = inject(Router);

  const isLogged = tokenService.isLogged();
  const isExpired = tokenService.isTokenExpired();

  if (isLogged && !isExpired) {
    log('✅ LoginGuard: Utilisateur déjà connecté - Redirection vers dashboard');
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};

// ─────────────────────────────────────────────────────────────────────────
// ⚠️ ALIAS DE COMPATIBILITÉ — à retirer des définitions de routes puis
// supprimer ce bloc. Conservés uniquement pour ne pas casser vos app-routing
// modules existants pendant la migration vers `accessGuard`.
// ─────────────────────────────────────────────────────────────────────────

/** @deprecated utiliser accessGuard */
export const authGuard: CanActivateFn = accessGuard;

/** @deprecated utiliser accessGuard */
export const permissionGuard: CanActivateFn = accessGuard;

/** @deprecated utiliser accessGuard */
export const roleGuard: CanActivateFn = accessGuard;

/**
 * @deprecated migrer la route vers `accessGuard` + `data: { superAdmin: true }`.
 * Contrairement aux autres alias, celui-ci ne peut pas être une simple
 * référence à accessGuard : le flag `superAdmin` doit être injecté dans
 * route.data avant délégation, sinon la vérification ne s'applique plus.
 */
export const superAdminGuard: CanActivateFn = (route, state) => {
  route.data = { ...route.data, superAdmin: true };
  return accessGuard(route, state);
};

/**
 * @deprecated migrer la route vers `accessGuard` + `data: { admin: true } }`.
 * Même remarque que superAdminGuard ci-dessus.
 */
export const pastorGuard: CanActivateFn = (route, state) => {
  route.data = { ...route.data, admin: true };
  return accessGuard(route, state);
};

/** @deprecated utiliser accessGuard */
export const combinedGuard: CanActivateFn = accessGuard;
