
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, tap, retry } from 'rxjs/operators';
import {
  User,
  UserCreate,
  UserUpdate,
  UserFilter,
  UserListResponse,
  UserChangePassword,
  UserUtils
} from '../../models/Users/user.model';
import { UserProfile, UserProfileCreate, UserProfileUpdate } from '../../models/Users/user-profile.model';
import { UserPreferences, DEFAULT_USER_PREFERENCES } from '../../models/Users/user-preferences.model';

import { environment } from '../../../../environments/environment';
import { Token } from '../Token/token';
import { ApiResponse } from '../../models/Common/api-response.model';

@Injectable({
  providedIn: 'root'
})

export class Users {

  private readonly baseUrl: string;

  constructor(
    private http: HttpClient,
    private tokenService: Token
  ) {
    this.baseUrl = `${environment.apiUrl}/api/v1/User`;
  }

  // ──────────────────────────────────────────────────────────────
  // 🔐 AUTHENTIFICATION
  // ──────────────────────────────────────────────────────────────

  /**
   * Inscription d'un nouvel utilisateur
   * POST /api/v1/User/register
   */
  register(userData: UserCreate): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(`${this.baseUrl}/register`, userData)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            console.log('✅ Utilisateur créé par Admin:', response.data);
          }
        }),
        catchError(this.handleError<User>('createUserAdmin'))
      );
  }


  /**
   * Récupérer l'utilisateur connecté
   * GET /api/v1/User/me
   */
  getCurrentUser(): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.baseUrl}/me`)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            console.log('👤 Utilisateur courant chargé');
          }
        }),
        catchError(this.handleError<User>('getCurrentUser'))
      );
  }

  /**
   * Mettre à jour le profil de l'utilisateur connecté
   * PUT /api/v1/User/me
   */
  updateCurrentUser(profileData: UserProfileCreate): Observable<ApiResponse<User>> {
    const formData = this.createProfileFormData(profileData);
    return this.http.put<ApiResponse<User>>(`${this.baseUrl}/me`, formData)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Profil utilisateur mis à jour');
          }
        }),
        catchError(this.handleError<User>('updateCurrentUser'))
      );
  }

  /**
   * Mettre à jour la photo de profil
   * PUT /api/v1/User/me/photo
   */
  updateProfilePhoto(photoFile: File): Observable<ApiResponse<User>> {
    const formData = new FormData();
    formData.append('photoFile', photoFile);

    return this.http.put<ApiResponse<User>>(`${this.baseUrl}/me/photo`, formData)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Photo de profil mise à jour');
          }
        }),
        catchError(this.handleError<User>('updateProfilePhoto'))
      );
  }


  /**
   * ✅ Récupérer l'URL complète de la photo d'un utilisateur
   * Cette méthode ne fait pas d'appel HTTP, elle construit simplement l'URL
   */
  getUserPhotoUrl(photoId: string | null | undefined): string {
    if (!photoId) {
      return '';
    }

    // Si c'est un ID MongoDB (24 caractères hexadécimaux)
    if (/^[0-9a-fA-F]{24}$/.test(photoId)) {
      return `${environment.apiUrl}/api/v1/User/photo/${photoId}`;
    }

    // Si c'est déjà une URL complète
    if (photoId.startsWith('http://') || photoId.startsWith('https://')) {
      return photoId;
    }

    // Si c'est le default-profile-photo
    if (photoId === 'default-profile-photo') {
      return '';
    }

    // Par défaut, construire l'URL
    return `${environment.apiUrl}/api/v1/User/photo/${photoId}`;
  }


  /**
 * Mettre à jour la photo d'un utilisateur spécifique (Admin)
 * PUT /api/v1/User/{id}/photo
 */
updateUserPhotoById(id: string, photoFile: File): Observable<ApiResponse<User>> {
  const formData = new FormData();
  formData.append('photoFile', photoFile);

  return this.http.put<ApiResponse<User>>(`${this.baseUrl}/${id}/photo`, formData)
    .pipe(
      tap(response => {
        if (response.success) {
          console.log('✅ Photo utilisateur mise à jour (admin)');
        }
      }),
      catchError(this.handleError<User>('updateUserPhotoById'))
    );
}

  /**
   * ✅ Récupérer la photo en tant que Blob
   * GET /api/v1/User/photo/{photoId}
   */
  getUserPhoto(photoId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/photo/${photoId}`, {
      responseType: 'blob'
    }).pipe(
      catchError((error: any) => {
        console.error('❌ Erreur lors du chargement de la photo:', error);
        // Retourner un Observable<Blob> vide ou une image par défaut
        return of(new Blob()); // ou throwError(() => error)
      })
    );
  }


  /**
   * Changer le mot de passe
   * POST /api/v1/User/change-password
   */
  changePassword(passwordData: UserChangePassword): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/change-password`, passwordData)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Mot de passe changé avec succès');
          }
        }),
        catchError(this.handleError<boolean>('changePassword'))
      );
  }

  /**
   * Vérifier l'authentification
   * GET /api/v1/User/check-auth
   */
  checkAuth(): Observable<ApiResponse<boolean>> {
    return this.http.get<ApiResponse<boolean>>(`${this.baseUrl}/check-auth`)
      .pipe(
        catchError(this.handleError<boolean>('checkAuth'))
      );
  }

  // ──────────────────────────────────────────────────────────────
  // 🔧 GESTION DES PRÉFÉRENCES
  // ──────────────────────────────────────────────────────────────

  /**
   * Récupérer les préférences de l'utilisateur
   * GET /api/v1/User/preferences
   */
  getUserPreferences(): Observable<ApiResponse<UserPreferences>> {
    return this.http.get<ApiResponse<UserPreferences>>(`${this.baseUrl}/preferences`)
      .pipe(
        map(response => {
          if (!response.data) {
            response.data = DEFAULT_USER_PREFERENCES;
          }
          return response;
        }),
        catchError(this.handleError<UserPreferences>('getUserPreferences'))
      );
  }

  /**
   * Mettre à jour les préférences
   * PUT /api/v1/User/preferences
   */
  updateUserPreferences(preferences: UserPreferences): Observable<ApiResponse<UserPreferences>> {
    return this.http.put<ApiResponse<UserPreferences>>(`${this.baseUrl}/preferences`, preferences)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Préférences mises à jour');
          }
        }),
        catchError(this.handleError<UserPreferences>('updateUserPreferences'))
      );
  }

  // ──────────────────────────────────────────────────────────────
  // 👥 GESTION ADMINISTRATIVE
  // ──────────────────────────────────────────────────────────────

  /**
   * Récupérer tous les utilisateurs (Admin uniquement)
   * GET /api/v1/User
   */
  getAllUsers(): Observable<ApiResponse<User[]>> {
    return this.http.get<ApiResponse<User[]>>(`${this.baseUrl}`)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`👥 ${response.data?.length || 0} utilisateurs chargés`);
          }
        }),
        catchError(this.handleError<User[]>('getAllUsers'))
      );
  }

  /**
   * Récupérer les utilisateurs avec filtres et pagination
   * GET /api/v1/User/search
   */
  // src/app/core/services/api/user.service.ts

  getUsers(filter: UserFilter): Observable<ApiResponse<UserListResponse>> {
    let params = new HttpParams()
      .set('page', filter.page.toString())
      .set('pageSize', filter.pageSize.toString());

    if (filter.fullName) params = params.set('fullName', filter.fullName);
    if (filter.firstName) params = params.set('firstName', filter.firstName);
    if (filter.lastName) params = params.set('lastName', filter.lastName);
    if (filter.username) params = params.set('username', filter.username);
    if (filter.email) params = params.set('email', filter.email);
    if (filter.phone) params = params.set('phone', filter.phone);
    if (filter.isActive !== undefined) params = params.set('isActive', filter.isActive.toString());
    if (filter.churchId) params = params.set('churchId', filter.churchId);
    if (filter.roles && filter.roles.length) params = params.set('roles', filter.roles.join(','));
    if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter.sortOrder) params = params.set('sortOrder', filter.sortOrder);
    if (filter.createdFrom) params = params.set('createdFrom', filter.createdFrom);
    if (filter.createdTo) params = params.set('createdTo', filter.createdTo);
    if (filter.lastLoginFrom) params = params.set('lastLoginFrom', filter.lastLoginFrom);
    if (filter.lastLoginTo) params = params.set('lastLoginTo', filter.lastLoginTo);

    return this.http.get<UserListResponse>(`${this.baseUrl}/search`, { params })
      .pipe(
        map(response => {
          // ✅ Transformer la réponse brute en ApiResponse
          return {
            success: true,
            message: 'Utilisateurs chargés avec succès',
            data: {
              items: response.items || [],
              totalCount: response.totalCount || 0,
              currentPage: response.currentPage || 1,
              totalPages: response.totalPages || 1,
              pageSize: response.pageSize || 25,
              hasPreviousPage: response.hasPreviousPage || false,
              hasNextPage: response.hasNextPage || false
            }
          } as ApiResponse<UserListResponse>;
        }),
        tap(response => {
          if (response.success) {
            console.log(`📋 ${response.data?.totalCount || 0} utilisateurs trouvés`);
          }
        }),
        catchError(this.handleError<UserListResponse>('getUsers'))
      );
  }

  /**
   * Récupérer un utilisateur par ID
   * GET /api/v1/User/{id}
   */
  getUserById(id: string): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.baseUrl}/${id}`)
      .pipe(
        catchError(this.handleError<User>('getUserById'))
      );
  }

  /**
   * Récupérer l'utilisateur par nom d'utilisateur
   * GET /api/v1/User/username/{username}
   */
  getUserByUsername(username: string): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.baseUrl}/username/${username}`)
      .pipe(
        catchError(this.handleError<User>('getUserByUsername'))
      );
  }

  /**
   * Récupérer l'utilisateur par email
   * GET /api/v1/User/email/{email}
   */
  getUserByEmail(email: string): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.baseUrl}/email/${email}`)
      .pipe(
        catchError(this.handleError<User>('getUserByEmail'))
      );
  }

  /**
   * Récupérer l'utilisateur par ID membre
   * GET /api/v1/User/member/{memberId}
   */
  getUserByMemberId(memberId: string): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.baseUrl}/member/${memberId}`)
      .pipe(
        catchError(this.handleError<User>('getUserByMemberId'))
      );
  }

  /**
   * Mettre à jour un utilisateur (Admin)
   * PUT /api/v1/User/{id}
   */
  updateUser(id: string, userData: UserUpdate): Observable<ApiResponse<User>> {
    const formData = this.createUpdateFormData(userData);
    return this.http.put<ApiResponse<User>>(`${this.baseUrl}/${id}`, formData)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Utilisateur mis à jour');
          }
        }),
        catchError(this.handleError<User>('updateUser'))
      );
  }

  /**
   * Activer/Désactiver un utilisateur
   * PUT /api/v1/User/{id}/status
   */
  toggleUserStatus(id: string): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/${id}/status`, {})
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('🔄 Statut utilisateur modifié');
          }
        }),
        catchError(this.handleError<boolean>('toggleUserStatus'))
      );
  }

  /**
   * Mettre à jour les rôles d'un utilisateur
   * PUT /api/v1/User/{id}/roles
   */
  updateUserRoles(id: string, roles: string[]): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/${id}/roles`, roles)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Rôles utilisateur mis à jour');
          }
        }),
        catchError(this.handleError<boolean>('updateUserRoles'))
      );
  }

  /**
   * Mettre à jour les permissions d'un utilisateur
   * PUT /api/v1/User/{id}/permissions
   */
  updateUserPermissions(id: string, permissions: string[]): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/${id}/permissions`, permissions)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Permissions utilisateur mises à jour');
          }
        }),
        catchError(this.handleError<boolean>('updateUserPermissions'))
      );
  }

  /**
   * Récupérer les champs modifiables pour un utilisateur
   * GET /api/v1/User/{id}/editable-fields
   */
  getEditableFields(id: string): Observable<ApiResponse<UserProfileCreate>> {
    return this.http.get<ApiResponse<UserProfileCreate>>(`${this.baseUrl}/${id}/editable-fields`)
      .pipe(
        catchError(this.handleError<UserProfileCreate>('getEditableFields'))
      );
  }

  /**
   * Exporter les utilisateurs
   * GET /api/v1/User/export/{fileType}
   */
  exportUsers(fileType: 'csv' | 'xlsx'): Observable<ApiResponse<Blob>> {
    return this.http.get(`${this.baseUrl}/export/${fileType}`, {
      responseType: 'blob'
    }).pipe(
      map(blob => {
        console.log(`📊 Export ${fileType} généré`);
        return {
          success: true,
          message: `Export ${fileType} généré avec succès`,
          data: blob
        } as ApiResponse<Blob>;

      }),
      catchError(this.handleError<Blob>('exportUsers'))
    );
  }

  // ──────────────────────────────────────────────────────────────
  // 🛠️ MÉTHODES UTILITAIRES
  // ──────────────────────────────────────────────────────────────


  /**
   * Créer FormData pour la mise à jour de profil
   */
  private createProfileFormData(profileData: UserProfileCreate): FormData {
    const formData = new FormData();
    this.appendProfileData(formData, profileData);
    return formData;
  }

  /**
   * Créer FormData pour la mise à jour (Admin)
   */
  private createUpdateFormData(userData: UserUpdate): FormData {
    const formData = new FormData();

    if (userData.username) formData.append('username', userData.username);
    if (userData.email) formData.append('email', userData.email);
    if (userData.phone) formData.append('phone', userData.phone);
    if (userData.firstName) formData.append('firstName', userData.firstName);
    if (userData.lastName) formData.append('lastName', userData.lastName);
    if (userData.photoUrl) formData.append('photoUrl', userData.photoUrl);
    if (userData.isActive !== undefined) formData.append('isActive', userData.isActive.toString());
    if (userData.churchId) formData.append('churchId', userData.churchId);

    if (userData.roles && userData.roles.length) {
      userData.roles.forEach(role => formData.append('roles', role));
    }

    if (userData.permissions && userData.permissions.length) {
      userData.permissions.forEach(permission => formData.append('permissions', permission));
    }

    if (userData.profile) {
      this.appendProfileData(formData, userData.profile);
    }

    return formData;
  }

  /**
   * Ajouter les données de profil au FormData
   */
  private appendProfileData(formData: FormData, profile: UserProfileCreate): void {
    if (profile.gender) formData.append('gender', profile.gender);
    if (profile.maritalStatus) formData.append('maritalStatus', profile.maritalStatus);
    if (profile.dateOfBirth) formData.append('dateOfBirth', profile.dateOfBirth);
    if (profile.address) formData.append('address', profile.address);
    if (profile.city) formData.append('city', profile.city);
    if (profile.country) formData.append('country', profile.country);
    if (profile.postalCode) formData.append('postalCode', profile.postalCode);
    if (profile.nationalId) formData.append('nationalId', profile.nationalId);
    if (profile.emergencyContact) formData.append('emergencyContact', profile.emergencyContact);
    if (profile.emergencyPhone) formData.append('emergencyPhone', profile.emergencyPhone);
    if (profile.numberOfChildren !== undefined) formData.append('numberOfChildren', profile.numberOfChildren.toString());
    if (profile.profession) formData.append('profession', profile.profession);
    if (profile.education) formData.append('education', profile.education);
    if (profile.notes) formData.append('notes', profile.notes);

    if (profile.preferences) {
      formData.append('preferences', JSON.stringify(profile.preferences));
    }
  }

  /**
 * ✅ Construire l'URL complète de la photo
 * Cette méthode ne fait PAS d'appel HTTP
 */
getPhotoUrl(photoId: string | null | undefined): string {
  if (!photoId || photoId === 'default-profile-photo') {
    return '';
  }

  // Si c'est un ID MongoDB (24 caractères hexadécimaux)
  if (/^[0-9a-fA-F]{24}$/.test(photoId)) {
    return `${environment.apiUrl}/api/v1/User/photo/${photoId}`;
  }

  // Si c'est déjà une URL complète
  if (photoId.startsWith('http://') || photoId.startsWith('https://')) {
    return photoId;
  }

  return `${environment.apiUrl}/api/v1/User/photo/${photoId}`;
}

  /**
   * Gestionnaire d'erreurs
   */
  private handleError<T>(operation = 'operation') {
    return (error: any): Observable<ApiResponse<T>> => {

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
