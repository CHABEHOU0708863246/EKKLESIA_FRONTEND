// src/app/core/services/api/budget.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/Common/api-response.model';

import {
  Budget,
  BudgetCreate,
  BudgetUpdate,
  BudgetFilter,
  BudgetListResponse,
  DEFAULT_BUDGET_FILTER,
  BudgetStatus
} from '../../models/Finances/budget.model';

import { BudgetComparisonDto } from '../../models/Finances/budget-comparison.model';
import { BudgetResponseDto, BudgetStatisticsDto } from '../../models/Finances/budget-statistics.model';

/**
 * Service de gestion des budgets.
 * Correspond au backend BudgetController.
 */
@Injectable({
  providedIn: 'root'
})
export class BudgetService {

  private readonly baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = `${environment.apiUrl}/api/v1/Budget`;
  }

  // ──────────────────────────────────────────────────────────────
  // 📝 CRUD
  // ──────────────────────────────────────────────────────────────

  /**
   * Crée un nouveau budget.
   * POST /api/v1/Budget
   */
  create(budget: BudgetCreate): Observable<ApiResponse<BudgetResponseDto>> {
    return this.http.post<ApiResponse<BudgetResponseDto>>(this.baseUrl, budget)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Budget créé:', response.data?.id);
          }
        }),
        catchError(this.handleError<BudgetResponseDto>('create'))
      );
  }

  /**
   * Récupère un budget par son ID.
   * GET /api/v1/Budget/{id}
   */
  getById(id: string): Observable<ApiResponse<BudgetResponseDto>> {
    return this.http.get<ApiResponse<BudgetResponseDto>>(`${this.baseUrl}/${id}`)
      .pipe(
        catchError(this.handleError<BudgetResponseDto>('getById'))
      );
  }

  /**
   * Récupère la liste paginée des budgets avec filtres.
   * GET /api/v1/Budget
   */
  getAll(filter: BudgetFilter = DEFAULT_BUDGET_FILTER): Observable<ApiResponse<BudgetListResponse>> {
    const params = this.buildFilterParams(filter);
    return this.http.get<ApiResponse<BudgetListResponse>>(this.baseUrl, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`📋 ${response.data?.totalCount || 0} budgets récupérés`);
          }
        }),
        catchError(this.handleError<BudgetListResponse>('getAll'))
      );
  }

  /**
   * Met à jour un budget existant.
   * PUT /api/v1/Budget/{id}
   */
  update(id: string, budget: BudgetUpdate): Observable<ApiResponse<BudgetResponseDto>> {
    return this.http.put<ApiResponse<BudgetResponseDto>>(`${this.baseUrl}/${id}`, budget)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('🔄 Budget mis à jour:', id);
          }
        }),
        catchError(this.handleError<BudgetResponseDto>('update'))
      );
  }

  /**
   * Supprime un budget (seulement si en brouillon).
   * DELETE /api/v1/Budget/{id}
   */
  delete(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('🗑️ Budget supprimé:', id);
          }
        }),
        catchError(this.handleError<boolean>('delete'))
      );
  }

  // ──────────────────────────────────────────────────────────────
  // 🔐 APPROBATION
  // ──────────────────────────────────────────────────────────────

  /**
   * Approuve un budget.
   * POST /api/v1/Budget/{id}/approve
   */
  approveBudget(id: string): Observable<ApiResponse<BudgetResponseDto>> {
    return this.http.post<ApiResponse<BudgetResponseDto>>(`${this.baseUrl}/${id}/approve`, {})
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Budget approuvé:', id);
          }
        }),
        catchError(this.handleError<BudgetResponseDto>('approveBudget'))
      );
  }

  /**
   * Rejette un budget.
   * POST /api/v1/Budget/{id}/reject
   */
  rejectBudget(id: string, reason?: string): Observable<ApiResponse<BudgetResponseDto>> {
    return this.http.post<ApiResponse<BudgetResponseDto>>(`${this.baseUrl}/${id}/reject`, reason || null)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('⛔ Budget rejeté:', id);
          }
        }),
        catchError(this.handleError<BudgetResponseDto>('rejectBudget'))
      );
  }

  /**
   * Clôture un budget.
   * POST /api/v1/Budget/{id}/close
   */
  closeBudget(id: string): Observable<ApiResponse<BudgetResponseDto>> {
    return this.http.post<ApiResponse<BudgetResponseDto>>(`${this.baseUrl}/${id}/close`, {})
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('🔒 Budget clôturé:', id);
          }
        }),
        catchError(this.handleError<BudgetResponseDto>('closeBudget'))
      );
  }

  // ──────────────────────────────────────────────────────────────
  // 📊 STATISTIQUES & COMPARAISON
  // ──────────────────────────────────────────────────────────────

  /**
   * Récupère les statistiques des budgets.
   * GET /api/v1/Budget/statistics
   */
  getStatistics(churchId?: string, year?: number): Observable<ApiResponse<BudgetStatisticsDto>> {
    let params = new HttpParams();
    if (churchId) params = params.set('churchId', churchId);
    if (year) params = params.set('year', year.toString());

    return this.http.get<ApiResponse<BudgetStatisticsDto>>(`${this.baseUrl}/statistics`, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('📊 Statistiques des budgets récupérées');
          }
        }),
        catchError(this.handleError<BudgetStatisticsDto>('getStatistics'))
      );
  }

  /**
   * Récupère la comparaison budget / réalisé.
   * GET /api/v1/Budget/{id}/comparison
   */
  getComparison(id: string): Observable<ApiResponse<BudgetComparisonDto>> {
    return this.http.get<ApiResponse<BudgetComparisonDto>>(`${this.baseUrl}/${id}/comparison`)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('📊 Comparaison du budget récupérée:', id);
          }
        }),
        catchError(this.handleError<BudgetComparisonDto>('getComparison'))
      );
  }

  // ──────────────────────────────────────────────────────────────
  // 🛠️ MÉTHODES PRIVÉES
  // ──────────────────────────────────────────────────────────────

  /**
   * Construit les paramètres HTTP à partir du filtre.
   */
  private buildFilterParams(filter: BudgetFilter): HttpParams {
    let params = new HttpParams()
      .set('page', filter.page.toString())
      .set('pageSize', filter.pageSize.toString());

    if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter.sortOrder) params = params.set('sortOrder', filter.sortOrder);

    if (filter.name) params = params.set('name', filter.name);
    if (filter.year) params = params.set('year', filter.year.toString());
    if (filter.status) params = params.set('status', filter.status);
    if (filter.churchId) params = params.set('churchId', filter.churchId);
    if (filter.siteId) params = params.set('siteId', filter.siteId);
    if (filter.createdBy) params = params.set('createdBy', filter.createdBy);
    if (filter.createdFrom) params = params.set('createdFrom', filter.createdFrom);
    if (filter.createdTo) params = params.set('createdTo', filter.createdTo);
    if (filter.approvedFrom) params = params.set('approvedFrom', filter.approvedFrom);
    if (filter.approvedTo) params = params.set('approvedTo', filter.approvedTo);
    if (filter.minTotalBudget !== undefined) params = params.set('minTotalBudget', filter.minTotalBudget.toString());
    if (filter.maxTotalBudget !== undefined) params = params.set('maxTotalBudget', filter.maxTotalBudget.toString());

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
