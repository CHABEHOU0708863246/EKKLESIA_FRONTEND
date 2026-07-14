// src/app/core/services/api/service.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/Common/api-response.model';
import { ServiceCreate, ServiceFilter, DEFAULT_SERVICE_FILTER, ServiceListResponse, ServiceUpdate, TeamMember, ServiceAttendance, ServiceStatus } from '../../models/Events/service.model';


@Injectable({
  providedIn: 'root'
})
export class Service {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/Service`;

  constructor(private http: HttpClient) {}

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
  // 👥 ÉQUIPE LITURGIQUE
  // ──────────────────────────────────────────────────────────────

  /**
   * Ajoute un membre à une équipe
   * POST /api/v1/Service/{id}/team/{team}
   */
  addTeamMember(serviceId: string, team: string, member: TeamMember): Observable<ApiResponse<Service>> {
    return this.http.post<ApiResponse<Service>>(
      `${this.baseUrl}/${serviceId}/team/${team}`,
      member
    );
  }

  /**
   * Retire un membre d'une équipe
   * DELETE /api/v1/Service/{id}/team/{team}/{memberId}
   */
  removeTeamMember(serviceId: string, team: string, memberId: string): Observable<ApiResponse<Service>> {
    return this.http.delete<ApiResponse<Service>>(
      `${this.baseUrl}/${serviceId}/team/${team}/${memberId}`
    );
  }

  /**
   * Confirme ou annule la confirmation d'un membre d'équipe
   * PUT /api/v1/Service/{id}/team/{team}/{memberId}/confirm
   */
  confirmTeamMember(
    serviceId: string,
    team: string,
    memberId: string,
    confirmed: boolean = true
  ): Observable<ApiResponse<Service>> {
    return this.http.put<ApiResponse<Service>>(
      `${this.baseUrl}/${serviceId}/team/${team}/${memberId}/confirm`,
      null,
      { params: { confirmed: confirmed.toString() } }
    );
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
   */
  updateStatus(serviceId: string, status: ServiceStatus): Observable<ApiResponse<Service>> {
    // Le backend attend une string dans le body
    return this.http.put<ApiResponse<Service>>(
      `${this.baseUrl}/${serviceId}/status`,
      status // Envoi direct de la valeur string
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

    if (filter.minMembers !== undefined) {
      params = params.set('minMembers', filter.minMembers.toString());
    }
    if (filter.maxMembers !== undefined) {
      params = params.set('maxMembers', filter.maxMembers.toString());
    }
    if (filter.minVisitors !== undefined) {
      params = params.set('minVisitors', filter.minVisitors.toString());
    }
    if (filter.maxVisitors !== undefined) {
      params = params.set('maxVisitors', filter.maxVisitors.toString());
    }

    return params;
  }
}
