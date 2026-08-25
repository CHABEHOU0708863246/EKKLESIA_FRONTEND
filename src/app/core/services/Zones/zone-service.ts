import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/Common/api-response.model';
import { ZoneFilter, ZoneListResponse, ZoneResponse, ZoneCreate, ZoneUpdate, ZoneStatistics } from '../../models/Zones/zone.model';
import { DEFAULT_ZONE_FILTER } from '../../models/Zones/zone.utils';

@Injectable({
  providedIn: 'root',
})
export class ZoneService {
  private readonly baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = `${environment.apiUrl}/api/v1/Zone`;
  }

  // ──────────────────────────────────────────────────────────────────
  // 📋 LISTE DES ZONES (avec filtres et pagination)
  // ──────────────────────────────────────────────────────────────────

  /**
   * Récupère la liste des zones avec filtres et pagination.
   * @param filter Critères de filtrage (optionnel)
   * @returns Observable<ApiResponse<ZoneListResponse>>
   */
  getZones(filter?: Partial<ZoneFilter>): Observable<ApiResponse<ZoneListResponse>> {
    const finalFilter = { ...DEFAULT_ZONE_FILTER, ...filter };
    let params = new HttpParams()
      .set('page', finalFilter.page.toString())
      .set('pageSize', finalFilter.pageSize.toString());

    if (finalFilter.name) params = params.set('name', finalFilter.name);
    if (finalFilter.churchId) params = params.set('churchId', finalFilter.churchId);
    if (finalFilter.chiefUserId) params = params.set('chiefUserId', finalFilter.chiefUserId);
    if (finalFilter.siteId) params = params.set('siteId', finalFilter.siteId);
    if (finalFilter.isActive !== undefined) params = params.set('isActive', finalFilter.isActive.toString());
    if (finalFilter.createdFrom) params = params.set('createdFrom', finalFilter.createdFrom);
    if (finalFilter.createdTo) params = params.set('createdTo', finalFilter.createdTo);
    if (finalFilter.sortBy) params = params.set('sortBy', finalFilter.sortBy);
    if (finalFilter.sortOrder) params = params.set('sortOrder', finalFilter.sortOrder);

    return this.http.get<ApiResponse<ZoneListResponse>>(`${this.baseUrl}`, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`📋 ${response.data?.totalCount || 0} zones récupérées`);
          }
        }),
        catchError(this.handleError<ZoneListResponse>('getZones'))
      );
  }

  /**
   * Récupère toutes les zones (sans pagination, uniquement actives).
   * @returns Observable<ApiResponse<ZoneResponse[]>>
   */
  getAllZones(): Observable<ApiResponse<ZoneResponse[]>> {
    return this.http.get<ApiResponse<ZoneResponse[]>>(`${this.baseUrl}`)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`🌐 ${response.data?.length || 0} zones récupérées (toutes)`);
          }
        }),
        catchError(this.handleError<ZoneResponse[]>('getAllZones'))
      );
  }

  // ──────────────────────────────────────────────────────────────────
  // 🔍 RÉCUPÉRATION D'UNE ZONE PAR ID
  // ──────────────────────────────────────────────────────────────────

  /**
   * Récupère une zone par son ID.
   * @param id ID de la zone
   * @returns Observable<ApiResponse<ZoneResponse>>
   */
  getZone(id: string): Observable<ApiResponse<ZoneResponse>> {
    return this.http.get<ApiResponse<ZoneResponse>>(`${this.baseUrl}/${id}`)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`🔍 Zone récupérée: ${response.data?.name}`);
          }
        }),
        catchError(this.handleError<ZoneResponse>('getZone'))
      );
  }

  /**
   * Récupère la zone dont l'utilisateur connecté est le chef.
   * @returns Observable<ApiResponse<ZoneResponse>>
   */
  getMyZone(): Observable<ApiResponse<ZoneResponse>> {
    return this.http.get<ApiResponse<ZoneResponse>>(`${this.baseUrl}/my-zone`)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`👤 Ma zone: ${response.data?.name}`);
          }
        }),
        catchError(this.handleError<ZoneResponse>('getMyZone'))
      );
  }

  // ──────────────────────────────────────────────────────────────────
  // ➕ CRÉATION D'UNE ZONE
  // ──────────────────────────────────────────────────────────────────

  /**
   * Crée une nouvelle zone.
   * @param data Données de création (ZoneCreate)
   * @returns Observable<ApiResponse<ZoneResponse>>
   */
  createZone(data: ZoneCreate): Observable<ApiResponse<ZoneResponse>> {
    return this.http.post<ApiResponse<ZoneResponse>>(`${this.baseUrl}`, data)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`✅ Zone créée: ${response.data?.name}`);
          }
        }),
        catchError(this.handleError<ZoneResponse>('createZone'))
      );
  }

  // ──────────────────────────────────────────────────────────────────
  // ✏️ MISE À JOUR D'UNE ZONE
  // ──────────────────────────────────────────────────────────────────

  /**
   * Met à jour une zone existante (nom, église).
   * @param id ID de la zone
   * @param data Données de mise à jour (ZoneUpdate)
   * @returns Observable<ApiResponse<ZoneResponse>>
   */
  updateZone(id: string, data: ZoneUpdate): Observable<ApiResponse<ZoneResponse>> {
    return this.http.put<ApiResponse<ZoneResponse>>(`${this.baseUrl}/${id}`, data)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`🔄 Zone mise à jour: ${response.data?.name}`);
          }
        }),
        catchError(this.handleError<ZoneResponse>('updateZone'))
      );
  }

  // ──────────────────────────────────────────────────────────────────
  // 👤 ASSIGNATION D'UN CHEF DE ZONE
  // ──────────────────────────────────────────────────────────────────

  /**
   * Assigne un nouveau chef à une zone.
   * @param id ID de la zone
   * @param chiefUserId ID de l'utilisateur (doit avoir le rôle ZONE_MANAGER)
   * @returns Observable<ApiResponse<boolean>>
   */
  assignChief(id: string, chiefUserId: string): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/${id}/chief`, { chiefUserId })
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`👤 Chef de zone assigné (utilisateur: ${chiefUserId})`);
          }
        }),
        catchError(this.handleError<boolean>('assignChief'))
      );
  }

  // ──────────────────────────────────────────────────────────────────
  // 📍 GESTION DES SITES D'UNE ZONE
  // ──────────────────────────────────────────────────────────────────

  /**
   * Ajoute un site à une zone.
   * @param id ID de la zone
   * @param siteId ID du site à ajouter
   * @returns Observable<ApiResponse<boolean>>
   */
  addSite(id: string, siteId: string): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/${id}/sites`, { siteId })
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`📍 Site ${siteId} ajouté à la zone ${id}`);
          }
        }),
        catchError(this.handleError<boolean>('addSite'))
      );
  }

  /**
   * Retire un site d'une zone.
   * @param id ID de la zone
   * @param siteId ID du site à retirer
   * @returns Observable<ApiResponse<boolean>>
   */
  removeSite(id: string, siteId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}/sites/${siteId}`)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`🗑️ Site ${siteId} retiré de la zone ${id}`);
          }
        }),
        catchError(this.handleError<boolean>('removeSite'))
      );
  }

  // ──────────────────────────────────────────────────────────────────
  // 🗑️ SUPPRESSION (SOFT DELETE) D'UNE ZONE
  // ──────────────────────────────────────────────────────────────────

  /**
   * Désactive une zone (soft delete). La zone reste en base mais n'est plus active.
   * @param id ID de la zone
   * @returns Observable<ApiResponse<boolean>>
   */
  deleteZone(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`🗑️ Zone ${id} désactivée`);
          }
        }),
        catchError(this.handleError<boolean>('deleteZone'))
      );
  }

  // ──────────────────────────────────────────────────────────────────
  // 📊 STATISTIQUES DES ZONES
  // ──────────────────────────────────────────────────────────────────

  /**
   * Récupère les statistiques des zones (nombre, répartition, etc.).
   * @returns Observable<ApiResponse<ZoneStatistics>>
   */
  getZoneStatistics(): Observable<ApiResponse<ZoneStatistics>> {
    return this.http.get<ApiResponse<ZoneStatistics>>(`${this.baseUrl}/statistics`)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`📊 Statistiques des zones récupérées`);
          }
        }),
        catchError(this.handleError<ZoneStatistics>('getZoneStatistics'))
      );
  }

  // ──────────────────────────────────────────────────────────────────
  // 🛠️ MÉTHODE UTILITAIRE DE GESTION D'ERREURS
  // ──────────────────────────────────────────────────────────────────

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
