// src/app/core/services/Donation/donations.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  PublicCulteDonation,
  CreateDonationIntent,
  DonationIntentResult,
  DonationStatus,
  DonationNotification,
} from '../../models/Donations/donation.model';

/**
 * Dons/offrandes en ligne d'un culte (Live Stream) — endpoints PUBLICS.
 * Un fidèle scanne le QR code, sans compte.
 */
@Injectable({ providedIn: 'root' })
export class Donations {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/public/Donation`;

  /** Culte public (titre, église, live) pour la page de don. */
  getCulte(serviceId: string): Observable<PublicCulteDonation> {
    return this.http.get<PublicCulteDonation>(`${this.baseUrl}/culte/${serviceId}`);
  }

  /** Crée une intention de don → renvoie le lien de paiement GeniusPay. */
  createIntent(serviceId: string, dto: CreateDonationIntent): Observable<DonationIntentResult> {
    return this.http.post<DonationIntentResult>(`${this.baseUrl}/culte/${serviceId}/intent`, dto);
  }

  /** Statut d'un don par référence Genius (polling). */
  getStatus(reference: string): Observable<DonationStatus> {
    return this.http.get<DonationStatus>(`${this.baseUrl}/${reference}/status`);
  }

  /** Statut d'un don par ID d'intention (retour de paiement GeniusPay). */
  getStatusById(intentId: string): Observable<DonationStatus> {
    return this.http.get<DonationStatus>(`${this.baseUrl}/intent/${intentId}/status`);
  }

  /** Notifications « remerciement » récentes (overlay live ; polling). */
  getNotifications(serviceId: string, since?: string): Observable<DonationNotification[]> {
    let params = new HttpParams();
    if (since) params = params.set('since', since);
    return this.http.get<DonationNotification[]>(`${this.baseUrl}/culte/${serviceId}/notifications`, { params });
  }
}
