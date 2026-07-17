// src/app/core/services/api/dashboard.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/Common/api-response.model';

import {
  DashboardDto,
  DashboardKpiDto,
  DashboardChartsDto,
  DEFAULT_DASHBOARD,
  DashboardUtils
} from '../../models/Dashboard/dashboard.model';

/**
 * Service de gestion du tableau de bord.
 * Correspond au backend DashboardController.
 */
@Injectable({
  providedIn: 'root'
})
export class Dashboards {

  private readonly baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = `${environment.apiUrl}/api/v1/Dashboard`;
  }

  // ──────────────────────────────────────────────────────────────
  // 📊 DONNÉES PRINCIPALES DU TABLEAU DE BORD
  // ──────────────────────────────────────────────────────────────

  /**
   * Récupère toutes les données du tableau de bord.
   * GET /api/v1/Dashboard
   */
  getDashboardData(churchId?: string): Observable<ApiResponse<DashboardDto>> {
    let params = new HttpParams();
    if (churchId) params = params.set('churchId', churchId);

    return this.http.get<ApiResponse<DashboardDto>>(this.baseUrl, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('📊 Données du tableau de bord récupérées');
          }
        }),
        catchError(this.handleError<DashboardDto>('getDashboardData'))
      );
  }

  // ──────────────────────────────────────────────────────────────
  // 📊 INDICATEURS PRINCIPAUX (KPIs)
  // ──────────────────────────────────────────────────────────────

  /**
   * Récupère uniquement les indicateurs principaux (KPI).
   * GET /api/v1/Dashboard/kpi
   */
  getKpiData(churchId?: string): Observable<ApiResponse<DashboardKpiDto>> {
    let params = new HttpParams();
    if (churchId) params = params.set('churchId', churchId);

    return this.http.get<ApiResponse<DashboardKpiDto>>(`${this.baseUrl}/kpi`, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('📊 KPIs récupérés');
          }
        }),
        catchError(this.handleError<DashboardKpiDto>('getKpiData'))
      );
  }

  // ──────────────────────────────────────────────────────────────
  // 📊 DONNÉES DES GRAPHIQUES
  // ──────────────────────────────────────────────────────────────

  /**
   * Récupère les données pour les graphiques uniquement.
   * GET /api/v1/Dashboard/charts
   */
  getChartData(churchId?: string): Observable<ApiResponse<DashboardChartsDto>> {
    let params = new HttpParams();
    if (churchId) params = params.set('churchId', churchId);

    return this.http.get<ApiResponse<DashboardChartsDto>>(`${this.baseUrl}/charts`, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('📊 Données des graphiques récupérées');
          }
        }),
        catchError(this.handleError<DashboardChartsDto>('getChartData'))
      );
  }

  // ──────────────────────────────────────────────────────────────
  // 🛠️ MÉTHODES PRIVÉES
  // ──────────────────────────────────────────────────────────────

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
