// src/app/core/services/api/offerings.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/Common/api-response.model';

import {
  Offering,
  OfferingCreate,
  OfferingUpdate,
  OfferingFilter,
  OfferingListResponse,
  OfferingValidate,
  OfferingStatisticsDto,
  OfferingSummaryDto,
  DEFAULT_OFFERING_FILTER,
  OfferingUtils,
  OfferingStatus,
  OfferingType,
} from '../../models/Finances/offering.model';

/**
 * Service de gestion des offrandes (dîmes, offrandes, collectes).
 * Correspond au backend OfferingController.
 */
@Injectable({
  providedIn: 'root'
})
export class Offerings {

  private readonly baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = `${environment.apiUrl}/api/v1/Offering`;
  }

  // ──────────────────────────────────────────────────────────────
  // 📝 CRUD
  // ──────────────────────────────────────────────────────────────

  /**
   * Crée une nouvelle offrande.
   * POST /api/v1/Offering
   */
  create(offering: OfferingCreate): Observable<ApiResponse<Offering>> {
    return this.http.post<ApiResponse<Offering>>(this.baseUrl, offering)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Offrande créée:', response.data?.id);
          }
        }),
        catchError(this.handleError<Offering>('create'))
      );
  }

  /**
   * Récupère une offrande par son ID.
   * GET /api/v1/Offering/{id}
   */
  getById(id: string): Observable<ApiResponse<Offering>> {
    return this.http.get<ApiResponse<Offering>>(`${this.baseUrl}/${id}`)
      .pipe(
        catchError(this.handleError<Offering>('getById'))
      );
  }

  /**
   * Récupère la liste paginée des offrandes avec filtres.
   * GET /api/v1/Offering
   */
  getAll(filter: OfferingFilter = DEFAULT_OFFERING_FILTER): Observable<ApiResponse<OfferingListResponse>> {
    const params = this.buildFilterParams(filter);
    return this.http.get<ApiResponse<OfferingListResponse>>(this.baseUrl, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`📋 ${response.data?.totalCount || 0} offrandes récupérées`);
          }
        }),
        catchError(this.handleError<OfferingListResponse>('getAll'))
      );
  }

  /**
   * Met à jour une offrande existante.
   * PUT /api/v1/Offering/{id}
   */
  update(id: string, offering: OfferingUpdate): Observable<ApiResponse<Offering>> {
    return this.http.put<ApiResponse<Offering>>(`${this.baseUrl}/${id}`, offering)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('🔄 Offrande mise à jour:', id);
          }
        }),
        catchError(this.handleError<Offering>('update'))
      );
  }

  /**
   * Supprime une offrande (seulement si non validée).
   * DELETE /api/v1/Offering/{id}
   */
  delete(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('🗑️ Offrande supprimée:', id);
          }
        }),
        catchError(this.handleError<boolean>('delete'))
      );
  }

  // ──────────────────────────────────────────────────────────────
  // 🔐 VALIDATION & ANNULATION
  // ──────────────────────────────────────────────────────────────

  /**
   * Valide ou vérifie une offrande.
   * POST /api/v1/Offering/{id}/validate
   */
  validateOffering(id: string, payload: OfferingValidate): Observable<ApiResponse<Offering>> {
    return this.http.post<ApiResponse<Offering>>(`${this.baseUrl}/${id}/validate`, payload)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Offrande validée:', id);
          }
        }),
        catchError(this.handleError<Offering>('validateOffering'))
      );
  }

  /**
   * Annule une offrande.
   * POST /api/v1/Offering/{id}/cancel
   */
  cancelOffering(id: string, reason?: string): Observable<ApiResponse<Offering>> {
    return this.http.post<ApiResponse<Offering>>(`${this.baseUrl}/${id}/cancel`, reason || null)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('⛔ Offrande annulée:', id);
          }
        }),
        catchError(this.handleError<Offering>('cancelOffering'))
      );
  }

  // ──────────────────────────────────────────────────────────────
  // 📄 REÇUS
  // ──────────────────────────────────────────────────────────────

  /**
   * Génère un reçu pour une offrande validée.
   * POST /api/v1/Offering/{id}/receipt
   */
  generateReceipt(id: string): Observable<ApiResponse<Offering>> {
    return this.http.post<ApiResponse<Offering>>(`${this.baseUrl}/${id}/receipt`, {})
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('📄 Reçu généré pour l\'offrande:', id);
          }
        }),
        catchError(this.handleError<Offering>('generateReceipt'))
      );
  }

  /**
   * Télécharge le PDF du reçu.
   * GET /api/v1/Offering/{id}/receipt-pdf
   */
  getReceiptPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/receipt-pdf`, {
      responseType: 'blob'
    }).pipe(
      catchError((error) => {
        console.error('❌ Erreur lors du téléchargement du reçu PDF:', error);
        throw error;
      })
    );
  }

  // ──────────────────────────────────────────────────────────────
  // 📊 STATISTIQUES
  // ──────────────────────────────────────────────────────────────

  /**
   * Récupère les statistiques globales des offrandes.
   * GET /api/v1/Offering/statistics
   */
  getStatistics(churchId?: string, from?: string, to?: string): Observable<ApiResponse<OfferingStatisticsDto>> {
    let params = new HttpParams();
    if (churchId) params = params.set('churchId', churchId);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);

    return this.http.get<ApiResponse<OfferingStatisticsDto>>(`${this.baseUrl}/statistics`, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('📊 Statistiques des offrandes récupérées');
          }
        }),
        catchError(this.handleError<OfferingStatisticsDto>('getStatistics'))
      );
  }

  /**
   * Récupère le résumé des offrandes d'un membre.
   * GET /api/v1/Offering/member/{memberId}/summary
   */
  getMemberSummary(memberId: string): Observable<ApiResponse<OfferingSummaryDto>> {
    return this.http.get<ApiResponse<OfferingSummaryDto>>(`${this.baseUrl}/member/${memberId}/summary`)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`📊 Résumé des offrandes du membre ${memberId}`);
          }
        }),
        catchError(this.handleError<OfferingSummaryDto>('getMemberSummary'))
      );
  }

  // ──────────────────────────────────────────────────────────────
  // 🛠️ MÉTHODES PRIVÉES
  // ──────────────────────────────────────────────────────────────

  /**
   * Construit les paramètres HTTP à partir du filtre.
   */
  private buildFilterParams(filter: OfferingFilter): HttpParams {
    let params = new HttpParams()
      .set('page', filter.page.toString())
      .set('pageSize', filter.pageSize.toString());

    if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter.sortOrder) params = params.set('sortOrder', filter.sortOrder);

    if (filter.type) params = params.set('type', filter.type);
    if (filter.types && filter.types.length) {
      filter.types.forEach(t => params = params.append('types', t));
    }
    if (filter.status) params = params.set('status', filter.status);
    if (filter.statuses && filter.statuses.length) {
      filter.statuses.forEach(s => params = params.append('statuses', s));
    }
    if (filter.memberId) params = params.set('memberId', filter.memberId);
    if (filter.churchId) params = params.set('churchId', filter.churchId);
    if (filter.siteId) params = params.set('siteId', filter.siteId);
    if (filter.serviceId) params = params.set('serviceId', filter.serviceId);
    if (filter.paymentMethod) params = params.set('paymentMethod', filter.paymentMethod);
    if (filter.dateFrom) params = params.set('dateFrom', filter.dateFrom);
    if (filter.dateTo) params = params.set('dateTo', filter.dateTo);
    if (filter.minAmount !== undefined) params = params.set('minAmount', filter.minAmount.toString());
    if (filter.maxAmount !== undefined) params = params.set('maxAmount', filter.maxAmount.toString());
    if (filter.receiptGenerated !== undefined) params = params.set('receiptGenerated', filter.receiptGenerated.toString());
    if (filter.receiptNumber) params = params.set('receiptNumber', filter.receiptNumber);

    return params;
  }

  /**
   * Gestionnaire d'erreurs standardisé.
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

      return new Observable<ApiResponse<T>>(observer => {
        observer.next(response);
        observer.complete();
      });
    };
  }
}
