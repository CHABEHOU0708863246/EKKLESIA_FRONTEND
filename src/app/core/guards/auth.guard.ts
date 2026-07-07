import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { Token } from "../services/Token/token";
import { Auth } from "../services/Auth/auth";
import { Permissions } from "../services/Permissions/permissions";

/**
 * `authGuard` : Fonction de garde pour protéger les routes en fonction de l'authentification
 * et des permissions/rôles.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const tokenService = inject(Token);
  const permissions = inject(Permissions);
  const router = inject(Router);

  console.log('🔍 AuthGuard: Vérification de l\'authentification...');

  // 1️⃣ Vérifier l'authentification
  const isLogged = tokenService.isLogged();
  const isExpired = tokenService.isTokenExpired();

  console.log('📊 AuthGuard: isLogged =', isLogged, 'isExpired =', isExpired);

  if (!isLogged || isExpired) {
    console.log('❌ AuthGuard: Token invalide ou expiré - Redirection vers login');
    tokenService.logout();
    // ✅ Retourner l'UrlTree correctement
    return router.createUrlTree(['/auth/login']);
  }

  console.log('✅ AuthGuard: Utilisateur authentifié');

  // 2️⃣ Récupérer les permissions et rôles requis depuis les données de la route
  const requiredPermissions = route.data?.['permissions'] as string[] || [];
  const requiredRoles = route.data?.['roles'] as string[] || [];

  console.log('📋 AuthGuard: Permissions requises:', requiredPermissions);
  console.log('📋 AuthGuard: Rôles requis:', requiredRoles);

  // 3️⃣ Vérifier les permissions
  if (requiredPermissions.length > 0) {
    const hasPermission = permissions.hasAnyPermission(...requiredPermissions);
    console.log('🔑 AuthGuard: A les permissions ?', hasPermission);
    if (!hasPermission) {
      console.log('❌ AuthGuard: Permissions manquantes - Redirection vers dashboard');
      return router.createUrlTree(['/dashboard']);
    }
    console.log('✅ AuthGuard: Permissions vérifiées avec succès');
  }

  // 4️⃣ Vérifier les rôles
  if (requiredRoles.length > 0) {
    const hasRole = permissions.hasAnyRole(...requiredRoles);
    console.log('👤 AuthGuard: A les rôles ?', hasRole);
    if (!hasRole) {
      console.log('❌ AuthGuard: Rôles manquants - Redirection vers dashboard');
      return router.createUrlTree(['/dashboard']);
    }
    console.log('✅ AuthGuard: Rôles vérifiés avec succès');
  }

  // ✅ Retourner true pour autoriser l'accès
  return true;
};

/**
 * Guard pour vérifier uniquement l'authentification
 */
export const simpleAuthGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(Token);
  const router = inject(Router);

  console.log('🔍 SimpleAuthGuard: Vérification de l\'authentification...');

  const isLogged = tokenService.isLogged();
  const isExpired = tokenService.isTokenExpired();

  if (isLogged && !isExpired) {
    console.log('✅ SimpleAuthGuard: Utilisateur authentifié');
    return true;
  }

  console.log('❌ SimpleAuthGuard: Non authentifié - Redirection vers login');
  tokenService.logout();
  return router.createUrlTree(['/auth/login']);
};

/**
 * Guard pour la page de login - Empêche l'accès si déjà connecté
 */
export const loginGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(Token);
  const router = inject(Router);

  console.log('🔍 LoginGuard: Vérification de l\'authentification...');

  const isLogged = tokenService.isLogged();
  const isExpired = tokenService.isTokenExpired();

  if (isLogged && !isExpired) {
    console.log('✅ LoginGuard: Utilisateur déjà connecté - Redirection vers dashboard');
    return router.createUrlTree(['/dashboard']);
  }

  console.log('✅ LoginGuard: Accès à la page de login autorisé');
  return true;
};

/**
 * Guard pour vérifier les permissions uniquement
 */
export const permissionGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(Token);
  const permissions = inject(Permissions);
  const router = inject(Router);

  // Vérifier l'authentification d'abord
  if (!tokenService.isLogged() || tokenService.isTokenExpired()) {
    console.log('❌ PermissionGuard: Non authentifié - Redirection vers login');
    tokenService.logout();
    return router.createUrlTree(['/auth/login']);
  }

  // Récupérer les permissions requises
  const requiredPermissions = route.data?.['permissions'] as string[] || [];

  if (requiredPermissions.length === 0) {
    console.log('✅ PermissionGuard: Aucune permission requise');
    return true;
  }

  // Vérifier les permissions
  const hasPermission = permissions.hasAnyPermission(...requiredPermissions);

  if (!hasPermission) {
    console.log(`❌ PermissionGuard: Permissions manquantes (${requiredPermissions.join(', ')})`);
    return router.createUrlTree(['/dashboard']);
  }

  console.log('✅ PermissionGuard: Permissions vérifiées avec succès');
  return true;
};

/**
 * Guard pour vérifier les rôles uniquement
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(Token);
  const permissions = inject(Permissions);
  const router = inject(Router);

  // Vérifier l'authentification d'abord
  if (!tokenService.isLogged() || tokenService.isTokenExpired()) {
    console.log('❌ RoleGuard: Non authentifié - Redirection vers login');
    tokenService.logout();
    return router.createUrlTree(['/auth/login']);
  }

  // Récupérer les rôles requis
  const requiredRoles = route.data?.['roles'] as string[] || [];

  if (requiredRoles.length === 0) {
    console.log('✅ RoleGuard: Aucun rôle requis');
    return true;
  }

  // Vérifier les rôles
  const hasRole = permissions.hasAnyRole(...requiredRoles);

  if (!hasRole) {
    console.log(`❌ RoleGuard: Rôles manquants (${requiredRoles.join(', ')})`);
    return router.createUrlTree(['/dashboard']);
  }

  console.log('✅ RoleGuard: Rôles vérifiés avec succès');
  return true;
};

/**
 * Guard pour vérifier si l'utilisateur est Super Admin
 */
export const superAdminGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(Token);
  const permissions = inject(Permissions);
  const router = inject(Router);

  if (!tokenService.isLogged() || tokenService.isTokenExpired()) {
    console.log('❌ SuperAdminGuard: Non authentifié - Redirection vers login');
    tokenService.logout();
    return router.createUrlTree(['/auth/login']);
  }

  if (!permissions.isSuperAdmin()) {
    console.log('❌ SuperAdminGuard: Accès réservé aux Super Admins');
    return router.createUrlTree(['/dashboard']);
  }

  console.log('✅ SuperAdminGuard: Super Admin vérifié');
  return true;
};

/**
 * Guard pour vérifier si l'utilisateur est un pasteur ou supérieur
 */
export const pastorGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(Token);
  const permissions = inject(Permissions);
  const router = inject(Router);

  if (!tokenService.isLogged() || tokenService.isTokenExpired()) {
    console.log('❌ PastorGuard: Non authentifié - Redirection vers login');
    tokenService.logout();
    return router.createUrlTree(['/auth/login']);
  }

  if (!permissions.isAdminOrAbove()) {
    console.log('❌ PastorGuard: Accès réservé aux pasteurs');
    return router.createUrlTree(['/dashboard']);
  }

  console.log('✅ PastorGuard: Pasteur vérifié');
  return true;
};

/**
 * Guard combiné - Vérifie plusieurs conditions
 */
export const combinedGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(Token);
  const permissions = inject(Permissions);
  const router = inject(Router);

  // 1️⃣ Vérifier l'authentification
  if (!tokenService.isLogged() || tokenService.isTokenExpired()) {
    console.log('❌ CombinedGuard: Non authentifié - Redirection vers login');
    tokenService.logout();
    return router.createUrlTree(['/auth/login']);
  }

  // 2️⃣ Récupérer les conditions depuis les données de la route
  const requiredPermissions = route.data?.['permissions'] as string[] || [];
  const requiredRoles = route.data?.['roles'] as string[] || [];
  const requireSuperAdmin = route.data?.['superAdmin'] as boolean || false;
  const requireAdmin = route.data?.['admin'] as boolean || false;

  // 3️⃣ Vérifier Super Admin
  if (requireSuperAdmin && !permissions.isSuperAdmin()) {
    console.log('❌ CombinedGuard: Super Admin requis');
    return router.createUrlTree(['/dashboard']);
  }

  // 4️⃣ Vérifier Admin
  if (requireAdmin && !permissions.isAdminOrAbove()) {
    console.log('❌ CombinedGuard: Admin requis');
    return router.createUrlTree(['/dashboard']);
  }

  // 5️⃣ Vérifier les permissions
  if (requiredPermissions.length > 0) {
    const hasPermission = permissions.hasAnyPermission(...requiredPermissions);
    if (!hasPermission) {
      console.log(`❌ CombinedGuard: Permissions manquantes (${requiredPermissions.join(', ')})`);
      return router.createUrlTree(['/dashboard']);
    }
  }

  // 6️⃣ Vérifier les rôles
  if (requiredRoles.length > 0) {
    const hasRole = permissions.hasAnyRole(...requiredRoles);
    if (!hasRole) {
      console.log(`❌ CombinedGuard: Rôles manquants (${requiredRoles.join(', ')})`);
      return router.createUrlTree(['/dashboard']);
    }
  }

  console.log('✅ CombinedGuard: Toutes les conditions vérifiées');
  return true;
};
