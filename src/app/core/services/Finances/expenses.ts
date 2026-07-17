import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/Common/api-response.model';

import {
  Expense,
  ExpenseCreate,
  ExpenseUpdate,
  ExpenseFilter,
  ExpenseListResponse,
  ExpenseApprove,
  ExpenseStatisticsDto,
  DEFAULT_EXPENSE_FILTER
} from '../../models/Finances/expense.model';

/**
 * Service de gestion des dépenses.
 * Correspond au backend ExpenseController.
 */
@Injectable({
  providedIn: 'root'
})
export class Expenses {

  private readonly baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = `${environment.apiUrl}/api/v1/Expense`;
  }

  // ──────────────────────────────────────────────────────────────
  // 📝 CRUD
  // ──────────────────────────────────────────────────────────────

  /**
   * Crée une nouvelle dépense.
   * POST /api/v1/Expense
   */
  create(expense: ExpenseCreate): Observable<ApiResponse<Expense>> {
    return this.http.post<ApiResponse<Expense>>(this.baseUrl, expense)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Dépense créée:', response.data?.id);
          }
        }),
        catchError(this.handleError<Expense>('create'))
      );
  }

  /**
   * Récupère une dépense par son ID.
   * GET /api/v1/Expense/{id}
   */
  getById(id: string): Observable<ApiResponse<Expense>> {
    return this.http.get<ApiResponse<Expense>>(`${this.baseUrl}/${id}`)
      .pipe(
        catchError(this.handleError<Expense>('getById'))
      );
  }

  /**
   * Récupère la liste paginée des dépenses avec filtres.
   * GET /api/v1/Expense
   */
  getAll(filter: ExpenseFilter = DEFAULT_EXPENSE_FILTER): Observable<ApiResponse<ExpenseListResponse>> {
    const params = this.buildFilterParams(filter);
    return this.http.get<ApiResponse<ExpenseListResponse>>(this.baseUrl, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`📋 ${response.data?.totalCount || 0} dépenses récupérées`);
          }
        }),
        catchError(this.handleError<ExpenseListResponse>('getAll'))
      );
  }

  /**
   * Met à jour une dépense existante.
   * PUT /api/v1/Expense/{id}
   */
  update(id: string, expense: ExpenseUpdate): Observable<ApiResponse<Expense>> {
    return this.http.put<ApiResponse<Expense>>(`${this.baseUrl}/${id}`, expense)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('🔄 Dépense mise à jour:', id);
          }
        }),
        catchError(this.handleError<Expense>('update'))
      );
  }

  /**
   * Supprime une dépense (seulement si en brouillon ou en attente).
   * DELETE /api/v1/Expense/{id}
   */
  delete(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('🗑️ Dépense supprimée:', id);
          }
        }),
        catchError(this.handleError<boolean>('delete'))
      );
  }

  // ──────────────────────────────────────────────────────────────
  // 🔐 APPROBATION & STATUT
  // ──────────────────────────────────────────────────────────────

  /**
   * Approuve ou rejette une dépense.
   * POST /api/v1/Expense/{id}/approve
   */
  approveExpense(id: string, payload: ExpenseApprove): Observable<ApiResponse<Expense>> {
    return this.http.post<ApiResponse<Expense>>(`${this.baseUrl}/${id}/approve`, payload)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Dépense approuvée/rejetée:', id);
          }
        }),
        catchError(this.handleError<Expense>('approveExpense'))
      );
  }

  /**
   * Marque une dépense comme payée.
   * POST /api/v1/Expense/{id}/pay
   */
  markAsPaid(id: string): Observable<ApiResponse<Expense>> {
    return this.http.post<ApiResponse<Expense>>(`${this.baseUrl}/${id}/pay`, {})
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('💰 Dépense marquée comme payée:', id);
          }
        }),
        catchError(this.handleError<Expense>('markAsPaid'))
      );
  }

  /**
   * Annule une dépense.
   * POST /api/v1/Expense/{id}/cancel
   */
  cancelExpense(id: string, reason?: string): Observable<ApiResponse<Expense>> {
    return this.http.post<ApiResponse<Expense>>(`${this.baseUrl}/${id}/cancel`, reason || null)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('⛔ Dépense annulée:', id);
          }
        }),
        catchError(this.handleError<Expense>('cancelExpense'))
      );
  }

  // ──────────────────────────────────────────────────────────────
  // 📊 STATISTIQUES
  // ──────────────────────────────────────────────────────────────

  /**
   * Récupère les statistiques des dépenses.
   * GET /api/v1/Expense/statistics
   */
  getStatistics(churchId?: string, from?: string, to?: string): Observable<ApiResponse<ExpenseStatisticsDto>> {
    let params = new HttpParams();
    if (churchId) params = params.set('churchId', churchId);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);

    return this.http.get<ApiResponse<ExpenseStatisticsDto>>(`${this.baseUrl}/statistics`, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('📊 Statistiques des dépenses récupérées');
          }
        }),
        catchError(this.handleError<ExpenseStatisticsDto>('getStatistics'))
      );
  }

  // ──────────────────────────────────────────────────────────────
  // 🛠️ MÉTHODES PRIVÉES
  // ──────────────────────────────────────────────────────────────

  /**
   * Construit les paramètres HTTP à partir du filtre.
   */
  private buildFilterParams(filter: ExpenseFilter): HttpParams {
    let params = new HttpParams()
      .set('page', filter.page.toString())
      .set('pageSize', filter.pageSize.toString());

    if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter.sortOrder) params = params.set('sortOrder', filter.sortOrder);

    if (filter.title) params = params.set('title', filter.title);
    if (filter.description) params = params.set('description', filter.description);
    if (filter.category) params = params.set('category', filter.category);
    if (filter.categories && filter.categories.length) {
      filter.categories.forEach(c => params = params.append('categories', c));
    }
    if (filter.status) params = params.set('status', filter.status);
    if (filter.statuses && filter.statuses.length) {
      filter.statuses.forEach(s => params = params.append('statuses', s));
    }
    if (filter.churchId) params = params.set('churchId', filter.churchId);
    if (filter.siteId) params = params.set('siteId', filter.siteId);
    if (filter.requestedBy) params = params.set('requestedBy', filter.requestedBy);
    if (filter.approvedBy) params = params.set('approvedBy', filter.approvedBy);
    if (filter.paymentMethod) params = params.set('paymentMethod', filter.paymentMethod);
    if (filter.budgetCode) params = params.set('budgetCode', filter.budgetCode);
    if (filter.minAmount !== undefined) params = params.set('minAmount', filter.minAmount.toString());
    if (filter.maxAmount !== undefined) params = params.set('maxAmount', filter.maxAmount.toString());
    if (filter.dateFrom) params = params.set('dateFrom', filter.dateFrom);
    if (filter.dateTo) params = params.set('dateTo', filter.dateTo);
    if (filter.createdFrom) params = params.set('createdFrom', filter.createdFrom);
    if (filter.createdTo) params = params.set('createdTo', filter.createdTo);
    if (filter.approvedFrom) params = params.set('approvedFrom', filter.approvedFrom);
    if (filter.approvedTo) params = params.set('approvedTo', filter.approvedTo);

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
