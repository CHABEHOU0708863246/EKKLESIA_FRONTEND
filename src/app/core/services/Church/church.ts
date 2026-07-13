import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap, catchError, of, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Church as ChurchModel,
  ChurchCreate,
  ChurchFilter,
  ChurchListResponse,
  DEFAULT_CHURCH_FILTER,
  ChurchUpdate,
  ChurchSummary
} from '../../models/Church/church.model';
import { SiteCreate, Site, SiteUpdate } from '../../models/Church/site.model';
import { ApiResponse } from '../../models/Common/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class Church {
  private readonly baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = `${environment.apiUrl}/api/v1/Church`;
  }

  // ──────────────────────────────────────────────────────────────────
  // 🏢 ÉGLISES - CRUD
  // ──────────────────────────────────────────────────────────────────

  createChurch(churchData: ChurchCreate): Observable<ApiResponse<ChurchModel>> {
    return this.http.post<ApiResponse<ChurchModel>>(`${this.baseUrl}`, churchData)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            console.log('✅ Église créée:', response.data.name); // ✅ corrigé (name, pas baseUrl)
          }
        }),
        catchError(this.handleError<ChurchModel>('createChurch'))
      );
  }

  getChurchById(id: string): Observable<ApiResponse<ChurchModel>> {
    return this.http.get<ApiResponse<ChurchModel>>(`${this.baseUrl}/${id}`)
      .pipe(
        catchError(this.handleError<ChurchModel>('getChurchById'))
      );
  }

  getChurches(filter?: Partial<ChurchFilter>): Observable<ApiResponse<ChurchListResponse>> {
    const finalFilter = { ...DEFAULT_CHURCH_FILTER, ...filter };
    let params = new HttpParams()
      .set('page', finalFilter.page.toString())
      .set('pageSize', finalFilter.pageSize.toString());

    if (finalFilter.name) params = params.set('name', finalFilter.name);
    if (finalFilter.legalName) params = params.set('legalName', finalFilter.legalName);
    if (finalFilter.email) params = params.set('email', finalFilter.email);
    if (finalFilter.phone) params = params.set('phone', finalFilter.phone);
    if (finalFilter.city) params = params.set('city', finalFilter.city);
    if (finalFilter.country) params = params.set('country', finalFilter.country);
    if (finalFilter.denomination) params = params.set('denomination', finalFilter.denomination);
    if (finalFilter.isHeadquarters !== undefined) params = params.set('isHeadquarters', finalFilter.isHeadquarters.toString());
    if (finalFilter.isActive !== undefined) params = params.set('isActive', finalFilter.isActive.toString());
    if (finalFilter.parentChurchId) params = params.set('parentChurchId', finalFilter.parentChurchId);
    if (finalFilter.foundedFrom) params = params.set('foundedFrom', finalFilter.foundedFrom);
    if (finalFilter.foundedTo) params = params.set('foundedTo', finalFilter.foundedTo);
    if (finalFilter.createdFrom) params = params.set('createdFrom', finalFilter.createdFrom);
    if (finalFilter.createdTo) params = params.set('createdTo', finalFilter.createdTo);
    if (finalFilter.createdBy) params = params.set('createdBy', finalFilter.createdBy);
    if (finalFilter.sortBy) params = params.set('sortBy', finalFilter.sortBy);
    if (finalFilter.sortOrder) params = params.set('sortOrder', finalFilter.sortOrder);

    return this.http.get<ApiResponse<ChurchListResponse>>(`${this.baseUrl}`, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`📋 ${response.data?.totalCount || 0} églises récupérées`);
          }
        }),
        catchError(this.handleError<ChurchListResponse>('getChurches'))
      );
  }


/**
 * Crée une église avec un logo (upload de fichier)
 * POST /api/v1/Church avec multipart/form-data
 */
createChurchWithLogo(churchData: ChurchCreate, logoFile: File): Observable<ApiResponse<ChurchModel>> {
  const formData = new FormData();

  // Ajouter les données JSON
  formData.append('church', JSON.stringify(churchData));

  // Ajouter le fichier logo
  formData.append('logoFile', logoFile);

  return this.http.post<ApiResponse<ChurchModel>>(`${this.baseUrl}/with-logo`, formData)
    .pipe(
      tap(response => {
        if (response.success && response.data) {
          console.log('✅ Église créée avec logo:', response.data.name);
        }
      }),
      catchError(this.handleError<ChurchModel>('createChurchWithLogo'))
    );
}

 getAllChurches(): Observable<ApiResponse<ChurchModel[]>> {
  return this.http.get<ApiResponse<ChurchListResponse>>(`${this.baseUrl}`).pipe(
    map(response => ({
      ...response,
      data: response.data?.items || []
    }) as ApiResponse<ChurchModel[]>),
    tap(response => {
      if (response.success) {
        console.log(`👥 ${response.data?.length || 0} églises récupérées`);
      }
    }),
    catchError(this.handleError<ChurchModel[]>('getAllChurches'))
  );
}

  updateChurch(id: string, churchData: ChurchUpdate): Observable<ApiResponse<ChurchModel>> {
    return this.http.put<ApiResponse<ChurchModel>>(`${this.baseUrl}/${id}`, churchData)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('🔄 Église mise à jour:', response.data?.name); // ✅ corrigé
          }
        }),
        catchError(this.handleError<ChurchModel>('updateChurch'))
      );
  }

  deleteChurch(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('🗑️ Église supprimée');
          }
        }),
        catchError(this.handleError<boolean>('deleteChurch'))
      );
  }

  toggleChurchStatus(id: string): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/${id}/toggle-status`, {})
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('🔄 Statut de l\'église modifié');
          }
        }),
        catchError(this.handleError<boolean>('toggleChurchStatus'))
      );
  }

  // ──────────────────────────────────────────────────────────────────
  // 📍 SITES - CRUD
  // ──────────────────────────────────────────────────────────────────

  addSiteToChurch(churchId: string, siteData: SiteCreate): Observable<ApiResponse<Site>> {
    return this.http.post<ApiResponse<Site>>(`${this.baseUrl}/${churchId}/sites`, siteData)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Site ajouté:', response.data?.name);
          }
        }),
        catchError(this.handleError<Site>('addSiteToChurch'))
      );
  }

  getSiteById(siteId: string): Observable<ApiResponse<Site>> {
    return this.http.get<ApiResponse<Site>>(`${this.baseUrl}/sites/${siteId}`)
      .pipe(
        catchError(this.handleError<Site>('getSiteById'))
      );
  }

  getSitesByChurchId(churchId: string): Observable<ApiResponse<Site[]>> {
    return this.http.get<ApiResponse<Site[]>>(`${this.baseUrl}/${churchId}/sites`)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`📍 ${response.data?.length || 0} sites récupérés`);
          }
        }),
        catchError(this.handleError<Site[]>('getSitesByChurchId'))
      );
  }

  updateSite(churchId: string, siteId: string, siteData: SiteUpdate): Observable<ApiResponse<Site>> {
    return this.http.put<ApiResponse<Site>>(`${this.baseUrl}/${churchId}/sites/${siteId}`, siteData)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('🔄 Site mis à jour:', response.data?.name);
          }
        }),
        catchError(this.handleError<Site>('updateSite'))
      );
  }

  removeSite(churchId: string, siteId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${churchId}/sites/${siteId}`)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('🗑️ Site supprimé');
          }
        }),
        catchError(this.handleError<boolean>('removeSite'))
      );
  }

  toggleSiteStatus(churchId: string, siteId: string): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/${churchId}/sites/${siteId}/toggle-status`, {})
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('🔄 Statut du site modifié');
          }
        }),
        catchError(this.handleError<boolean>('toggleSiteStatus'))
      );
  }

  // ──────────────────────────────────────────────────────────────────
  // 📊 RÉSUMÉ & STATISTIQUES
  // ──────────────────────────────────────────────────────────────────

  getChurchSummary(): Observable<ApiResponse<ChurchSummary>> {
    return this.http.get<ApiResponse<ChurchSummary>>(`${this.baseUrl}/summary`)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`📊 Résumé: ${response.data?.totalChurches || 0} églises`);
          }
        }),
        catchError(this.handleError<ChurchSummary>('getChurchSummary'))
      );
  }

  // ──────────────────────────────────────────────────────────────────
  // 🛠️ MÉTHODES UTILITAIRES
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
