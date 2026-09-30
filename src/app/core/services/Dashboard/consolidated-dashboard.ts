import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/Common/api-response.model';

export interface ScopeFinancialTotal {
  amount: number;
  currency: string;
  churchesCount: number;
  offeringsCount: number;
}

export interface InternationalCurrencyTotal {
  currency: string;
  amount: number;
  churchesCount: number;
  offeringsCount: number;
}

export interface ConsolidationRate {
  from: string;
  to: string;
  rate: number;
  rateDate: string;
  originalAmount: number;
  convertedAmount: number;
}

export interface ConsolidatedDashboard {
  from: string;
  to: string;
  referenceCurrency: string;
  national: ScopeFinancialTotal;
  international: InternationalCurrencyTotal[];
  synthese: ScopeFinancialTotal;
  rates: ConsolidationRate[];
  conversionNote: string;
}

/**
 * Tableau de bord consolidé (National / International / Synthèse). Le serveur
 * refuse (403) ces vues aux pasteurs de site. (RG-P1-3..7)
 */
@Injectable({ providedIn: 'root' })
export class ConsolidatedDashboardService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/Dashboard`;

  constructor(private http: HttpClient) {}

  getConsolidated(from?: string, to?: string): Observable<ApiResponse<ConsolidatedDashboard>> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<ApiResponse<ConsolidatedDashboard>>(`${this.baseUrl}/consolidated`, { params });
  }
}
