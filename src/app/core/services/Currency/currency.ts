import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/Common/api-response.model';

export interface ExchangeRateDto {
  base: string;
  quote: string;
  rate: number;
  effectiveFrom: string;
  source?: string;
}

export interface CurrencyConversion {
  amount: number;
  from: string;
  to: string;
  rate: number;
  rateDate: string;
  converted: number;
}

/**
 * Devises & taux de change historisés. La gestion des taux est réservée aux
 * gestionnaires d'église côté serveur. (RT5)
 */
@Injectable({ providedIn: 'root' })
export class Currency {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/Currency`;

  constructor(private http: HttpClient) {}

  getRates(): Observable<ApiResponse<ExchangeRateDto[]>> {
    return this.http.get<ApiResponse<ExchangeRateDto[]>>(`${this.baseUrl}/rates`);
  }

  upsertRate(dto: ExchangeRateDto): Observable<ApiResponse<ExchangeRateDto>> {
    return this.http.post<ApiResponse<ExchangeRateDto>>(`${this.baseUrl}/rates`, dto);
  }

  convert(amount: number, from: string, to: string, at?: string): Observable<ApiResponse<CurrencyConversion>> {
    let params = new HttpParams().set('amount', amount.toString()).set('from', from).set('to', to);
    if (at) params = params.set('at', at);
    return this.http.get<ApiResponse<CurrencyConversion>>(`${this.baseUrl}/convert`, { params });
  }
}
