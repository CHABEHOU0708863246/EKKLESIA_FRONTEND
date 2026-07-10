import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/Common/api-response.model';
import { RoleCreateDto, RoleResponseDto, RoleFilterDto, RoleListResponseDto, DEFAULT_ROLE_FILTER, RoleDropdownDto, RoleDtoUtils, RoleUpdateDto, RoleAssignDto, RoleMultipleAssignDto, RoleSummaryDto, MigrationResultDto, CleanupResultDto, ResetResultDto } from '../../models/Roles/role.models';


@Injectable({
  providedIn: 'root'
})
export class Roles {

  private readonly baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = `${environment.apiUrl}/api/v1/Role`;
  }

  // ──────────────────────────────────────────────────────────────
  // 📝 CRUD - Création, Lecture, Mise à jour, Suppression
  // ──────────────────────────────────────────────────────────────

  /**
   * Créer un nouveau rôle
   * POST /api/v1/Role
   */
  createRole(roleData: RoleCreateDto): Observable<ApiResponse<RoleResponseDto>> {
    return this.http.post<ApiResponse<RoleResponseDto>>(`${this.baseUrl}`, roleData)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            console.log('✅ Rôle créé:', response.data.roleName);
          }
        }),
        catchError(this.handleError<RoleResponseDto>('createRole'))
      );
  }

  /**
   * Récupérer tous les rôles avec pagination et filtres
   * GET /api/v1/Role
   */
  getRoles(filter?: Partial<RoleFilterDto>): Observable<ApiResponse<RoleListResponseDto>> {
    const finalFilter = { ...DEFAULT_ROLE_FILTER, ...filter };
    let params = new HttpParams()
      .set('page', finalFilter.page.toString())
      .set('pageSize', finalFilter.pageSize.toString());

    if (finalFilter.isVisible !== undefined) params = params.set('isVisible', finalFilter.isVisible.toString());
    if (finalFilter.isSystem !== undefined) params = params.set('isSystem', finalFilter.isSystem.toString());

    return this.http.get<ApiResponse<RoleListResponseDto>>(`${this.baseUrl}`, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`📋 ${response.data?.totalCount || 0} rôles récupérés`);
          }
        }),
        catchError(this.handleError<RoleListResponseDto>('getRoles'))
      );
  }

  /**
   * Récupérer un rôle par son ID
   * GET /api/v1/Role/{id}
   */
  getRoleById(id: string): Observable<ApiResponse<RoleResponseDto>> {
    return this.http.get<ApiResponse<RoleResponseDto>>(`${this.baseUrl}/${id}`)
      .pipe(
        catchError(this.handleError<RoleResponseDto>('getRoleById'))
      );
  }

  /**
   * Récupérer un rôle par son code
   * GET /api/v1/Role/code/{code}
   */
  getRoleByCode(code: string): Observable<ApiResponse<RoleResponseDto>> {
    return this.http.get<ApiResponse<RoleResponseDto>>(`${this.baseUrl}/code/${code}`)
      .pipe(
        catchError(this.handleError<RoleResponseDto>('getRoleByCode'))
      );
  }

  /**
   * Récupérer tous les rôles système
   * GET /api/v1/Role/system
   */
  getSystemRoles(): Observable<ApiResponse<RoleResponseDto[]>> {
    return this.http.get<ApiResponse<RoleResponseDto[]>>(`${this.baseUrl}/system`)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`🏷️ ${response.data?.length || 0} rôles système récupérés`);
          }
        }),
        catchError(this.handleError<RoleResponseDto[]>('getSystemRoles'))
      );
  }

  /**
   * Récupérer tous les rôles personnalisés
   * GET /api/v1/Role/custom
   */
  getCustomRoles(): Observable<ApiResponse<RoleResponseDto[]>> {
    return this.http.get<ApiResponse<RoleResponseDto[]>>(`${this.baseUrl}/custom`)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`📝 ${response.data?.length || 0} rôles personnalisés récupérés`);
          }
        }),
        catchError(this.handleError<RoleResponseDto[]>('getCustomRoles'))
      );
  }

  /**
   * Récupérer les rôles pour les listes déroulantes
   */
  getRolesForDropdown(): Observable<ApiResponse<RoleDropdownDto[]>> {
    return this.getRoles({ page: 1, pageSize: 100, isVisible: true }).pipe(
      map(response => {
        if (response.success && response.data) {
          const dropdownItems = response.data.items.map(role => RoleDtoUtils.toDropdown(role));
          return {
            ...response,
            data: dropdownItems
          } as ApiResponse<RoleDropdownDto[]>;
        }
        return {
          success: false,
          message: 'Erreur lors de la récupération des rôles',
          data: null as any
        } as ApiResponse<RoleDropdownDto[]>;
      })
    );
  }

  /**
   * Mettre à jour un rôle
   * PUT /api/v1/Role/{id}
   */
  updateRole(id: string, roleData: RoleUpdateDto): Observable<ApiResponse<RoleResponseDto>> {
    return this.http.put<ApiResponse<RoleResponseDto>>(`${this.baseUrl}/${id}`, roleData)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('🔄 Rôle mis à jour:', response.data?.roleName);
          }
        }),
        catchError(this.handleError<RoleResponseDto>('updateRole'))
      );
  }

  /**
   * Supprimer un rôle
   * DELETE /api/v1/Role/{id}
   */
  deleteRole(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('🗑️ Rôle supprimé');
          }
        }),
        catchError(this.handleError<boolean>('deleteRole'))
      );
  }

  /**
   * Cloner un rôle
   * POST /api/v1/Role/clone/{id}
   */
  cloneRole(id: string, newName: string): Observable<ApiResponse<RoleResponseDto>> {
    return this.http.post<ApiResponse<RoleResponseDto>>(`${this.baseUrl}/clone/${id}`, newName)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('📋 Rôle cloné:', response.data?.roleName);
          }
        }),
        catchError(this.handleError<RoleResponseDto>('cloneRole'))
      );
  }

  // ──────────────────────────────────────────────────────────────
  // 👤 ASSIGNATION AUX UTILISATEURS
  // ──────────────────────────────────────────────────────────────

  /**
   * Assigner un rôle à un utilisateur
   * POST /api/v1/Role/assign
   */
  assignRoleToUser(userId: string, roleId: string): Observable<ApiResponse<boolean>> {
    const assignData: RoleAssignDto = { userId, roleId };
    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/assign`, assignData)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Rôle assigné à l\'utilisateur');
          }
        }),
        catchError(this.handleError<boolean>('assignRoleToUser'))
      );
  }

  /**
   * Assigner plusieurs rôles à un utilisateur
   * POST /api/v1/Role/assign-multiple
   */
  assignMultipleRolesToUser(userId: string, roleIds: string[]): Observable<ApiResponse<boolean>> {
    const assignData: RoleMultipleAssignDto = { userId, roleIds };
    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/assign-multiple`, assignData)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`✅ ${roleIds.length} rôles assignés à l'utilisateur`);
          }
        }),
        catchError(this.handleError<boolean>('assignMultipleRolesToUser'))
      );
  }

  /**
   * Retirer un rôle d'un utilisateur
   * DELETE /api/v1/Role/remove
   */
  removeRoleFromUser(userId: string, roleId: string): Observable<ApiResponse<boolean>> {
    const removeData: RoleAssignDto = { userId, roleId };
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/remove`, { body: removeData })
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('⛔ Rôle retiré de l\'utilisateur');
          }
        }),
        catchError(this.handleError<boolean>('removeRoleFromUser'))
      );
  }

  /**
   * Récupérer tous les rôles d'un utilisateur
   * GET /api/v1/Role/user/{userId}
   */
  getUserRoles(userId: string): Observable<ApiResponse<RoleResponseDto[]>> {
    return this.http.get<ApiResponse<RoleResponseDto[]>>(`${this.baseUrl}/user/${userId}`)
      .pipe(
        catchError(this.handleError<RoleResponseDto[]>('getUserRoles'))
      );
  }

  /**
   * Vérifier si un utilisateur a un rôle spécifique
   * GET /api/v1/Role/user/{userId}/has-role/{roleName}
   */
  userHasRole(userId: string, roleName: string): Observable<ApiResponse<boolean>> {
    return this.http.get<ApiResponse<boolean>>(`${this.baseUrl}/user/${userId}/has-role/${roleName}`)
      .pipe(
        catchError(this.handleError<boolean>('userHasRole'))
      );
  }

  // ──────────────────────────────────────────────────────────────
  // 🔐 GESTION DES PERMISSIONS
  // ──────────────────────────────────────────────────────────────

  /**
   * Récupérer toutes les permissions disponibles
   * GET /api/v1/Role/permissions/all
   */
  getAllPermissions(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.baseUrl}/permissions/all`)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`🔑 ${response.data?.length || 0} permissions disponibles`);
          }
        }),
        catchError(this.handleError<string[]>('getAllPermissions'))
      );
  }

  /**
   * Récupérer les permissions groupées par module
   * GET /api/v1/Role/permissions/grouped
   */
  getPermissionsGrouped(): Observable<ApiResponse<Record<string, string[]>>> {
    return this.http.get<ApiResponse<Record<string, string[]>>>(`${this.baseUrl}/permissions/grouped`)
      .pipe(
        tap(response => {
          if (response.success) {
            const count = Object.keys(response.data || {}).length;
            console.log(`📂 ${count} modules de permissions récupérés`);
          }
        }),
        catchError(this.handleError<Record<string, string[]>>('getPermissionsGrouped'))
      );
  }

  /**
   * Ajouter une permission à un rôle
   * POST /api/v1/Role/{id}/permissions
   */
  addPermissionToRole(roleId: string, permission: string): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/${roleId}/permissions`, permission)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Permission ajoutée au rôle');
          }
        }),
        catchError(this.handleError<boolean>('addPermissionToRole'))
      );
  }

  /**
   * Retirer une permission d'un rôle
   * DELETE /api/v1/Role/{id}/permissions/{permission}
   */
  removePermissionFromRole(roleId: string, permission: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${roleId}/permissions/${permission}`)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('⛔ Permission retirée du rôle');
          }
        }),
        catchError(this.handleError<boolean>('removePermissionFromRole'))
      );
  }

  /**
   * Mettre à jour toutes les permissions d'un rôle
   * PUT /api/v1/Role/{id}/permissions
   */
  updateRolePermissions(roleId: string, permissions: string[]): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/${roleId}/permissions`, permissions)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`🔄 ${permissions.length} permissions mises à jour`);
          }
        }),
        catchError(this.handleError<boolean>('updateRolePermissions'))
      );
  }

  // ──────────────────────────────────────────────────────────────
  // 📊 RÉSUMÉ ET STATISTIQUES
  // ──────────────────────────────────────────────────────────────

  /**
   * Récupérer le résumé des rôles
   * GET /api/v1/Role/summary
   */
  getRoleSummary(): Observable<ApiResponse<RoleSummaryDto>> {
    return this.http.get<ApiResponse<RoleSummaryDto>>(`${this.baseUrl}/summary`)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`📊 Résumé: ${response.data?.totalRoles || 0} rôles au total`);
          }
        }),
        catchError(this.handleError<RoleSummaryDto>('getRoleSummary'))
      );
  }

  /**
   * Récupérer les statistiques d'utilisation des rôles
   * GET /api/v1/Role/statistics/usage
   */
  getRoleUsageStatistics(): Observable<ApiResponse<Record<string, number>>> {
    return this.http.get<ApiResponse<Record<string, number>>>(`${this.baseUrl}/statistics/usage`)
      .pipe(
        tap(response => {
          if (response.success) {
            const count = Object.keys(response.data || {}).length;
            console.log(`📊 ${count} rôles avec statistiques d'utilisation`);
          }
        }),
        catchError(this.handleError<Record<string, number>>('getRoleUsageStatistics'))
      );
  }

  // ──────────────────────────────────────────────────────────────
  // 🛠️ MIGRATION ET MAINTENANCE
  // ──────────────────────────────────────────────────────────────

  /**
   * Migrer les rôles existants (ajouter les champs manquants)
   * POST /api/v1/Admin/Migration/migrate-roles
   */
  migrateRoles(): Observable<ApiResponse<MigrationResultDto>> {
    return this.http.post<ApiResponse<MigrationResultDto>>(`${this.baseUrl}/migrate`, {})
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('🔄 Migration des rôles terminée');
          }
        }),
        catchError(this.handleError<MigrationResultDto>('migrateRoles'))
      );
  }

  /**
   * Nettoyer les rôles invalides
   * POST /api/v1/Admin/Migration/cleanup-roles
   */
  cleanupRoles(): Observable<ApiResponse<CleanupResultDto>> {
    return this.http.post<ApiResponse<CleanupResultDto>>(`${this.baseUrl}/cleanup`, {})
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('🧹 Nettoyage des rôles terminé');
          }
        }),
        catchError(this.handleError<CleanupResultDto>('cleanupRoles'))
      );
  }

  /**
   * Réinitialiser tous les rôles (⚠️ DESTRUCTIF)
   * POST /api/v1/Admin/Migration/reset-roles
   */
  resetRoles(): Observable<ApiResponse<ResetResultDto>> {
    return this.http.post<ApiResponse<ResetResultDto>>(`${this.baseUrl}/reset`, {})
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('⚠️ Rôles réinitialisés');
          }
        }),
        catchError(this.handleError<ResetResultDto>('resetRoles'))
      );
  }

  // ──────────────────────────────────────────────────────────────
  // 🛠️ MÉTHODES UTILITAIRES
  // ──────────────────────────────────────────────────────────────

  /**
   * Gestionnaire d'erreurs
   */
  private handleError<T>(operation = 'operation') {
    return (error: any): Observable<ApiResponse<T>> => {
      console.error(`❌ Erreur ${operation}:`, error);

      let errorMessage = 'Une erreur est survenue';
      if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      const response: ApiResponse<T> = {
        success: false,
        message: errorMessage,
        data: null as any,
        errors: error.error?.errors || []
      };

      return of(response);
    };
  }
}
