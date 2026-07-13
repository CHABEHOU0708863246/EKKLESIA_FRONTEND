import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PastoralActCreateDto, PastoralActResponseDto, PastoralActFilterDto, DEFAULT_PASTORAL_ACT_FILTER, PastoralActListResponseDto, PastoralActUpdateDto, PastoralActStatisticsDto } from '../../models/PastoralAct/pastoral-act.dtos';



/**
 * Service de gestion des actes pastoraux (baptêmes, mariages, funérailles, dédicaces).
 * Fournit les appels API pour le CRUD, la génération de certificats et les recherches.
 */
@Injectable({
  providedIn: 'root'
})
export class PastoralActs {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/PastoralAct`;

  constructor(private http: HttpClient) {}

  // ──────────────────────────────────────────────────────────────
  // 📝 CRUD
  // ──────────────────────────────────────────────────────────────

  /**
   * Crée un nouvel acte pastoral
   * POST /api/v1/PastoralAct
   */
  create(pastoralAct: PastoralActCreateDto): Observable<PastoralActResponseDto> {
    return this.http.post<PastoralActResponseDto>(this.baseUrl, pastoralAct);
  }

  /**
   * Récupère un acte pastoral par son ID
   * GET /api/v1/PastoralAct/{id}
   */
  getById(id: string): Observable<PastoralActResponseDto> {
    return this.http.get<PastoralActResponseDto>(`${this.baseUrl}/${id}`);
  }

  /**
   * Récupère la liste paginée des actes pastoraux avec filtres
   * GET /api/v1/PastoralAct
   */
  getAll(filter: PastoralActFilterDto = DEFAULT_PASTORAL_ACT_FILTER): Observable<PastoralActListResponseDto> {
    const params = this.buildFilterParams(filter);
    return this.http.get<PastoralActListResponseDto>(this.baseUrl, { params });
  }

  /**
   * Met à jour un acte pastoral existant
   * PUT /api/v1/PastoralAct/{id}
   */
  update(id: string, pastoralAct: PastoralActUpdateDto): Observable<PastoralActResponseDto> {
    return this.http.put<PastoralActResponseDto>(`${this.baseUrl}/${id}`, pastoralAct);
  }

  /**
   * Supprime un acte pastoral (soft delete)
   * DELETE /api/v1/PastoralAct/{id}
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // ──────────────────────────────────────────────────────────────
  // 📜 CERTIFICATS
  // ──────────────────────────────────────────────────────────────

  /**
   * Génère un numéro de certificat officiel pour un acte pastoral
   * POST /api/v1/PastoralAct/{id}/certificate
   */
  generateCertificate(id: string): Observable<PastoralActResponseDto> {
    return this.http.post<PastoralActResponseDto>(`${this.baseUrl}/${id}/certificate`, {});
  }

  // ──────────────────────────────────────────────────────────────
  // 🔍 RECHERCHE PAR MEMBRE
  // ──────────────────────────────────────────────────────────────

  /**
   * Récupère tous les actes pastoraux liés à un membre donné
   * GET /api/v1/PastoralAct/member/{memberId}
   */
  getByMember(memberId: string): Observable<PastoralActResponseDto[]> {
    return this.http.get<PastoralActResponseDto[]>(`${this.baseUrl}/member/${memberId}`);
  }

  // ──────────────────────────────────────────────────────────────
  // 📊 STATISTIQUES (optionnel – si vous souhaitez ajouter un endpoint dédié)
  // ──────────────────────────────────────────────────────────────

  /**
   * Récupère les statistiques des actes pastoraux
   * GET /api/v1/PastoralAct/statistics
   */
  getStatistics(churchId?: string): Observable<PastoralActStatisticsDto> {
    let params = new HttpParams();
    if (churchId) params = params.set('churchId', churchId);
    return this.http.get<PastoralActStatisticsDto>(`${this.baseUrl}/statistics`, { params });
  }

  // ──────────────────────────────────────────────────────────────
  // 🛠️ MÉTHODES PRIVÉES (construction des paramètres)
  // ──────────────────────────────────────────────────────────────

  /**
   * Construit les paramètres de requête à partir du filtre.
   */
  private buildFilterParams(filter: PastoralActFilterDto): HttpParams {
    let params = new HttpParams()
      .set('page', filter.page.toString())
      .set('pageSize', filter.pageSize.toString());

    if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter.sortOrder) params = params.set('sortOrder', filter.sortOrder);

    if (filter.type !== undefined && filter.type !== null) {
      params = params.set('type', filter.type);
    }
    if (filter.memberId) params = params.set('memberId', filter.memberId);
    if (filter.officiantId) params = params.set('officiantId', filter.officiantId);
    if (filter.churchId) params = params.set('churchId', filter.churchId);
    if (filter.siteId) params = params.set('siteId', filter.siteId);

    if (filter.dateFrom) params = params.set('dateFrom', this.toISOString(filter.dateFrom));
    if (filter.dateTo) params = params.set('dateTo', this.toISOString(filter.dateTo));

    if (filter.certificateGenerated !== undefined && filter.certificateGenerated !== null) {
      params = params.set('certificateGenerated', filter.certificateGenerated.toString());
    }

    return params;
  }

  /**
   * Convertit une date en chaîne ISO (format accepté par le backend).
   */
  private toISOString(date: Date | string): string {
    if (typeof date === 'string') return date;
    return date.toISOString();
  }
}
