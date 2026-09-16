// src/app/core/services/Event/public-registration-service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  PublicEventDetails,
  EventPublicRegistrationPayload,
  EventPublicRegistrationResponse,
  RegistrationStatusResponse,
  PaymentReceiptDto,
  ReceiptIdentity,
  PublicChurchOption,
  PublicSiteOption,
} from '../../models/Events/event.model';

@Injectable({ providedIn: 'root' })
export class PublicRegistrationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/public/PublicRegistration`;

  getEventDetails(eventId: string): Observable<PublicEventDetails> {
    return this.http.get<PublicEventDetails>(`${this.baseUrl}/events/${eventId}`);
  }

  getUpcomingEvents(limit = 5): Observable<any[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<any[]>(`${this.baseUrl}/events/upcoming`, { params });
  }

  register(payload: EventPublicRegistrationPayload): Observable<EventPublicRegistrationResponse> {
    return this.http.post<EventPublicRegistrationResponse>(`${this.baseUrl}/register`, payload);
  }

  getRegistrationStatus(attendeeId: string): Observable<RegistrationStatusResponse> {
    return this.http.get<RegistrationStatusResponse>(`${this.baseUrl}/status/${attendeeId}`);
  }

  // ══════════════════════════════════════════════════════════
  // RÉFÉRENTIEL PUBLIC (églises / sites)
  // ══════════════════════════════════════════════════════════

  /**
   * Liste publique minimale des églises actives (id + nom).
   * `GET /api/v1/public/PublicRegistration/churches`
   *
   * ⚠️ `ChurchController` exige désormais un token : un visiteur anonyme ne
   * peut donc plus appeler `Church.getAllChurches()`. Ce endpoint public dédié
   * expose uniquement ce dont le formulaire d'inscription a besoin.
   */
  getPublicChurches(): Observable<PublicChurchOption[]> {
    return this.http.get<PublicChurchOption[]>(`${this.baseUrl}/churches`);
  }

  /** Sites actifs d'une église (id + nom). */
  getPublicChurchSites(churchId: string): Observable<PublicSiteOption[]> {
    return this.http.get<PublicSiteOption[]>(`${this.baseUrl}/churches/${churchId}/sites`);
  }

  // ══════════════════════════════════════════════════════════
  // REÇU DE PAIEMENT
  // ══════════════════════════════════════════════════════════

  /**
   * Reçu du participant. Renvoie 404 tant que le paiement n'est pas confirmé —
   * l'appelant doit donc traiter l'erreur comme un cas normal, pas comme un échec.
   *
   * 🔒 Le backend exige désormais une preuve d'identité : `email` OU `phone`
   * du participant (ou du payeur tiers). Sans correspondance → 404 indistinct
   * (anti-énumération).
   */
  getReceipt(
    attendeeId: string,
    identity: ReceiptIdentity
  ): Observable<PaymentReceiptDto> {
    return this.http.get<PaymentReceiptDto>(
      `${this.baseUrl}/receipt/${attendeeId}`,
      { params: this.buildIdentityParams(identity) }
    );
  }

  /** Renvoi du reçu par email, pour le participant qui a perdu son message. */
  resendReceipt(
    attendeeId: string,
    identity: ReceiptIdentity
  ): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.baseUrl}/receipt/${attendeeId}/resend`,
      {},
      { params: this.buildIdentityParams(identity) }
    );
  }

  private buildIdentityParams(identity: ReceiptIdentity): HttpParams {
    let params = new HttpParams();
    const email = identity.email?.trim();
    const phone = identity.phone?.trim();
    if (email) params = params.set('email', email);
    if (phone) params = params.set('phone', phone);
    return params;
  }
}
