import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/Common/api-response.model';
import { CurrencyCatalogItem } from '../Currency/currency';

/**
 * Service monétaire partagé (RG-CURR-01/04) : charge une fois le catalogue des
 * devises et expose la contre-valeur en FCFA (XOF) pour tout montant saisi ou
 * affiché, quelle que soit la devise.
 */
@Injectable({ providedIn: 'root' })
export class MoneyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/Currency`;

  private readonly reference = 'XOF';
  private readonly rates = signal<Record<string, number>>({ XOF: 1, FCFA: 1 });
  private loading = false;

  /** Charge le catalogue (idempotent). */
  load(): void {
    if (this.loading) return;
    this.loading = true;
    this.http.get<ApiResponse<CurrencyCatalogItem[]>>(`${this.baseUrl}/catalog`).subscribe({
      next: (res) => {
        const map: Record<string, number> = { XOF: 1, FCFA: 1 };
        for (const c of res?.data ?? []) map[c.codeIso] = c.exchangeRateToXOF || 1;
        this.rates.set(map);
      },
      error: () => { /* repli : XOF seul */ },
    });
  }

  /** Normalise « FCFA » → « XOF ». */
  private norm(code: string | null | undefined): string {
    const c = (code ?? '').trim().toUpperCase();
    return c === 'FCFA' || c === '' ? this.reference : c;
  }

  /** La devise est-elle différente de la devise pivot (XOF) ? */
  isForeign(code: string | null | undefined): boolean {
    return this.norm(code) !== this.reference;
  }

  /** Taux vers XOF (1 si inconnu ou déjà XOF). */
  rate(code: string | null | undefined): number {
    const c = this.norm(code);
    return this.rates()[c] ?? 1;
  }

  /** Contre-valeur en FCFA (arrondie à l'unité). */
  xof(amount: number | null | undefined, code: string | null | undefined): number {
    return Math.round((Number(amount) || 0) * this.rate(code));
  }
}
