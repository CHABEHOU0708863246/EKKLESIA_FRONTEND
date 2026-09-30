// src/app/core/services/api/service.service.ts

import { Injectable } from '@angular/core';
import { switchMap } from 'rxjs/operators';
import { compressedFormData } from '../../utils/upload.helper';
import { UploadProgressService } from '../Uploads/upload-progress.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/Common/api-response.model';
import {
  ServiceCreate,
  ServiceFilter,
  DEFAULT_SERVICE_FILTER,
  ServiceListResponse,
  ServiceUpdate,
  ServiceAttendance,
  ServiceStatus
} from '../../models/Events/service.model';

/** Répartition agrégée des effectifs (API). */
export interface AttendanceSummary {
  servicesCount: number;
  men: number;
  women: number;
  boys: number;
  girls: number;
  teenBoys: number;
  teenGirls: number;
  unallocated: number;
  visitors: number;
  newConverts: number;
  youth: number;
  adults: number;
  minors: number;
  totalPresent: number;
  totalAll: number;
}

@Injectable({
  providedIn: 'root'
})
export class Service {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/Service`;

  constructor(
    private http: HttpClient,
    private uploadProgress: UploadProgressService
  ) { }

  // ──────────────────────────────────────────────────────────────
  // 📝 CRUD
  // ──────────────────────────────────────────────────────────────

  /**
   * Crée un nouveau culte
   * POST /api/v1/Service
   */
  create(serviceData: ServiceCreate): Observable<ApiResponse<Service>> {
    return this.http.post<ApiResponse<Service>>(this.baseUrl, serviceData);
  }

  /**
   * Récupère un culte par son ID
   * GET /api/v1/Service/{id}
   */
  getById(id: string): Observable<ApiResponse<Service>> {
    return this.http.get<ApiResponse<Service>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Récupère la liste paginée des cultes avec filtres
   * GET /api/v1/Service
   */
  getAll(filter: ServiceFilter = DEFAULT_SERVICE_FILTER): Observable<ApiResponse<ServiceListResponse>> {
    const params = this.buildFilterParams(filter);
    return this.http.get<ApiResponse<ServiceListResponse>>(this.baseUrl, { params });
  }

  /**
   * Met à jour un culte
   * PUT /api/v1/Service/{id}
   */
  update(id: string, serviceData: ServiceUpdate): Observable<ApiResponse<Service>> {
    return this.http.put<ApiResponse<Service>>(`${this.baseUrl}/${id}`, serviceData);
  }

  /**
   * Supprime un culte
   * DELETE /api/v1/Service/{id}
   */
  delete(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }

  // ──────────────────────────────────────────────────────────────
  // 📸 PHOTO DU CULTE (nouveau)
  // ──────────────────────────────────────────────────────────────

  /**
   * Upload une photo justificative pour un culte
   * POST /api/v1/Service/{id}/photo
   */
  /** Répartition agrégée des effectifs (période, périmètre consolidé). */
  getAttendanceSummary(from?: string, to?: string, scope?: string): Observable<ApiResponse<AttendanceSummary>> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    if (scope) params = params.set('scope', scope);
    return this.http.get<ApiResponse<AttendanceSummary>>(`${this.baseUrl}/attendance/summary`, { params });
  }

  /** Export de la répartition (Excel/PDF) sous forme de fichier. */
  exportAttendanceSummary(format: 'xlsx' | 'pdf', from?: string, to?: string, scope?: string): Observable<Blob> {
    let params = new HttpParams().set('format', format);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    if (scope) params = params.set('scope', scope);
    return this.http.get(`${this.baseUrl}/attendance/summary/export`, { params, responseType: 'blob' });
  }

  uploadPhoto(serviceId: string, photoFile: File): Observable<{ success: boolean; photoId?: string; message?: string }> {
    return compressedFormData('photoFile', photoFile).pipe(
      switchMap((formData) =>
        this.uploadProgress.wrap(
          this.http.post<{ success: boolean; photoId?: string; message?: string }>(
            `${this.baseUrl}/${serviceId}/photo`,
            formData
          )
        )
      )
    );
  }

  /**
   * Retourne l'URL complète pour afficher une photo de culte
   */
  getPhotoUrl(photoId: string): string {
    if (!photoId) return '';
    return `${this.baseUrl}/photos/${photoId}`;
  }

  /**
   * Récupère une photo de culte
   * GET /api/v1/Service/photos/{photoId}
   * Retourne un blob (image)
   */
  getPhoto(photoId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/photos/${photoId}`, { responseType: 'blob' });
  }

  // ──────────────────────────────────────────────────────────────
  // 📊 PRÉSENCES & STATUT
  // ──────────────────────────────────────────────────────────────

  /**
   * Enregistre les présences d'un culte
   * PUT /api/v1/Service/{id}/attendance
   */
  recordAttendance(serviceId: string, attendance: ServiceAttendance): Observable<ApiResponse<Service>> {
    return this.http.put<ApiResponse<Service>>(
      `${this.baseUrl}/${serviceId}/attendance`,
      attendance
    );
  }

  /**
   * Met à jour le statut d'un culte
   * PUT /api/v1/Service/{id}/status
   * Le backend attend une chaîne dans le body.
   */
  updateStatus(serviceId: string, status: ServiceStatus): Observable<ApiResponse<Service>> {
    return this.http.put<ApiResponse<Service>>(
      `${this.baseUrl}/${serviceId}/status`,
      status // envoi direct de la valeur string
    );
  }

  // ──────────────────────────────────────────────────────────────
  // 🛠️ MÉTHODES PRIVÉES
  // ──────────────────────────────────────────────────────────────

  /**
   * Construit les paramètres de requête à partir du filtre
   */
  private buildFilterParams(filter: ServiceFilter): HttpParams {
    let params = new HttpParams()
      .set('page', filter.page.toString())
      .set('pageSize', filter.pageSize.toString());

    if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter.sortOrder) params = params.set('sortOrder', filter.sortOrder);

    if (filter.title) params = params.set('title', filter.title);
    if (filter.preacherId) params = params.set('preacherId', filter.preacherId);
    if (filter.preacherName) params = params.set('preacherName', filter.preacherName);
    if (filter.bibleText) params = params.set('bibleText', filter.bibleText);
    if (filter.theme) params = params.set('theme', filter.theme);

    if (filter.status) params = params.set('status', filter.status);
    if (filter.churchId) params = params.set('churchId', filter.churchId);
    if (filter.siteId) params = params.set('siteId', filter.siteId);

    if (filter.dateFrom) params = params.set('dateFrom', filter.dateFrom);
    if (filter.dateTo) params = params.set('dateTo', filter.dateTo);
    if (filter.createdFrom) params = params.set('createdFrom', filter.createdFrom);
    if (filter.createdTo) params = params.set('createdTo', filter.createdTo);

    if (filter.minVisitors !== undefined) {
      params = params.set('minVisitors', filter.minVisitors.toString());
    }
    if (filter.maxVisitors !== undefined) {
      params = params.set('maxVisitors', filter.maxVisitors.toString());
    }

    return params;
  }
}
