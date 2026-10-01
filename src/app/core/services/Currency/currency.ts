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

/** Devise du catalogue, avec son taux vers la devise pivot XOF. RG-CURR-02. */
export interface CurrencyCatalogItem {
  codeIso: string;
  label?: string;
  symbol?: string;
  decimals: number;
  exchangeRateToXOF: number;
  isActive: boolean;
  isReference: boolean;
}

/**
 * Devises & taux de change historisés. La gestion des taux est réservée aux
 * gestionnaires d'église côté serveur. (RT5)
 */
@Injectable({ providedIn: 'root' })
export class Currency {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/Currency`;

  constructor(private http: HttpClient) {}

  /** Catalogue des devises actives (sélecteur du formulaire d'offrande). RG-CURR-02. */
  getCatalog(): Observable<ApiResponse<CurrencyCatalogItem[]>> {
    return this.http.get<ApiResponse<CurrencyCatalogItem[]>>(`${this.baseUrl}/catalog`);
  }

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
