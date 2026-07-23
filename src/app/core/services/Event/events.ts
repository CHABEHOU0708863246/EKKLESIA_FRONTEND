import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  Event,
  EventCreate,
  EventUpdate,
  EventFilter,
  EventListResponse,
  EventSummary,
  EventAttendeeRegister,
  EventAttendeeCheckIn,
  DEFAULT_EVENT_FILTER,
  EventFormula,
  EventPublicRegistrationDto,
  EventPublicRegistrationResponseDto,
  RegistrationStatusResponse
} from '../../models/Events/event.model';
import { ApiResponse } from '../../models/Common/api-response.model';

// DTOs pour les formules (à ajouter dans le modèle)
export interface FormulaCreateDto {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  capacity: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface FormulaUpdateDto {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  capacity?: number;
  isActive?: boolean;
  sortOrder?: number;
}

@Injectable({
  providedIn: 'root'
})
export class Events {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/Event`;
  private readonly publicBaseUrl = `${environment.apiUrl}/api/v1/public/PublicRegistration`;

  constructor(private http: HttpClient) {}

  // ============================================================
  // GESTION DES ÉVÉNEMENTS (admin)
  // ============================================================

  /**
   * Crée un nouvel événement
   * POST /api/v1/Event
   */
  create(eventData: EventCreate): Observable<ApiResponse<Event>> {
    return this.http.post<ApiResponse<Event>>(this.baseUrl, eventData);
  }

  /**
   * Récupère un événement par son ID
   * GET /api/v1/Event/{id}
   */
  getById(id: string): Observable<Event> {
    return this.http.get<Event>(`${this.baseUrl}/${id}`);
  }

  /**
   * Récupère la liste paginée des événements
   * GET /api/v1/Event
   */
  getAll(filter: EventFilter = DEFAULT_EVENT_FILTER): Observable<EventListResponse> {
    const params = this.buildFilterParams(filter);
    return this.http.get<EventListResponse>(this.baseUrl, { params });
  }

  /**
   * Récupère les événements à venir (admin)
   * GET /api/v1/Event/upcoming
   */
  getUpcoming(churchId?: string, limit: number = 10): Observable<Event[]> {
    let params = new HttpParams().set('limit', limit.toString());
    if (churchId) params = params.set('churchId', churchId);
    return this.http.get<Event[]>(`${this.baseUrl}/upcoming`, { params });
  }

  /**
   * Met à jour un événement
   * PUT /api/v1/Event/{id}
   */
  update(id: string, eventData: EventUpdate): Observable<ApiResponse<Event>> {
    return this.http.put<ApiResponse<Event>>(`${this.baseUrl}/${id}`, eventData);
  }

  /**
   * Annule un événement
   * POST /api/v1/Event/{id}/cancel
   */
  cancel(id: string): Observable<ApiResponse<Event>> {
    return this.http.post<ApiResponse<Event>>(`${this.baseUrl}/${id}/cancel`, {});
  }

  /**
   * Supprime un événement (soft delete)
   * DELETE /api/v1/Event/{id}
   */
  delete(id: string): Observable<boolean> {
    return this.http.delete<boolean>(`${this.baseUrl}/${id}`);
  }

  // ============================================================
  // FORMULES (admin)
  // ============================================================

  /**
   * Ajoute une formule à un événement
   * POST /api/v1/Event/{eventId}/formula
   */
  addFormula(eventId: string, formulaData: FormulaCreateDto): Observable<ApiResponse<Event>> {
    return this.http.post<ApiResponse<Event>>(`${this.baseUrl}/${eventId}/formula`, formulaData);
  }

  /**
   * Met à jour une formule
   * PUT /api/v1/Event/{eventId}/formula/{formulaId}
   */
  updateFormula(eventId: string, formulaId: string, formulaData: FormulaUpdateDto): Observable<ApiResponse<Event>> {
    return this.http.put<ApiResponse<Event>>(`${this.baseUrl}/${eventId}/formula/${formulaId}`, formulaData);
  }

  /**
   * Supprime une formule
   * DELETE /api/v1/Event/{eventId}/formula/{formulaId}
   */
  removeFormula(eventId: string, formulaId: string): Observable<ApiResponse<Event>> {
    return this.http.delete<ApiResponse<Event>>(`${this.baseUrl}/${eventId}/formula/${formulaId}`);
  }

  // ============================================================
  // INSCRIPTIONS ADMIN
  // ============================================================

  /**
   * Inscrit un participant (admin)
   * POST /api/v1/Event/{eventId}/register
   */
  registerAttendee(eventId: string, registration: EventAttendeeRegister): Observable<ApiResponse<Event>> {
    return this.http.post<ApiResponse<Event>>(`${this.baseUrl}/${eventId}/register`, registration);
  }

  /**
   * Désinscrit un participant
   * DELETE /api/v1/Event/{eventId}/register/{attendeeIdentifier}
   */
  unregisterAttendee(eventId: string, attendeeIdentifier: string): Observable<boolean> {
    return this.http.delete<boolean>(`${this.baseUrl}/${eventId}/register/${attendeeIdentifier}`);
  }

  /**
   * Check-in d'un participant
   * POST /api/v1/Event/checkin
   */
  checkInAttendee(checkInData: EventAttendeeCheckIn): Observable<ApiResponse<Event>> {
    return this.http.post<ApiResponse<Event>>(`${this.baseUrl}/checkin`, checkInData);
  }

  // ============================================================
  // ENDPOINTS PUBLICS (sans authentification)
  // ============================================================

  /**
   * Liste des événements à venir (public)
   * GET /api/v1/public/PublicRegistration/events/upcoming
   */
  getPublicUpcomingEvents(limit: number = 5): Observable<any[]> {
    let params = new HttpParams().set('limit', limit.toString());
    return this.http.get<any[]>(`${this.publicBaseUrl}/events/upcoming`, { params });
  }

  /**
   * Détails d'un événement (public)
   * GET /api/v1/public/PublicRegistration/events/{eventId}
   */
  getPublicEventDetails(eventId: string): Observable<any> {
    return this.http.get<any>(`${this.publicBaseUrl}/events/${eventId}`);
  }

  /**
   * Inscription publique à un événement (avec paiement)
   * POST /api/v1/public/PublicRegistration/register
   */
  registerPublic(registration: EventPublicRegistrationDto): Observable<EventPublicRegistrationResponseDto> {
    return this.http.post<EventPublicRegistrationResponseDto>(`${this.publicBaseUrl}/register`, registration);
  }

  /**
   * Vérifier le statut de paiement d'une inscription publique
   * GET /api/v1/public/PublicRegistration/status/{attendeeId}
   */
  getRegistrationStatus(attendeeId: string): Observable<RegistrationStatusResponse> {
    return this.http.get<RegistrationStatusResponse>(`${this.publicBaseUrl}/status/${attendeeId}`);
  }

  // ============================================================
  // STATISTIQUES (optionnel)
  // ============================================================

  getSummary(churchId?: string): Observable<EventSummary> {
    let params = new HttpParams();
    if (churchId) params = params.set('churchId', churchId);
    return this.http.get<EventSummary>(`${this.baseUrl}/summary`, { params });
  }

  // ============================================================
  // MÉTHODE PRIVÉE
  // ============================================================

  private buildFilterParams(filter: EventFilter): HttpParams {
    let params = new HttpParams()
      .set('page', filter.page.toString())
      .set('pageSize', filter.pageSize.toString());

    if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter.sortOrder) params = params.set('sortOrder', filter.sortOrder);

    if (filter.title) params = params.set('title', filter.title);
    if (filter.type) params = params.set('type', filter.type);
    if (filter.status) params = params.set('status', filter.status);
    if (filter.organizerId) params = params.set('organizerId', filter.organizerId);
    if (filter.churchId) params = params.set('churchId', filter.churchId);
    if (filter.siteId) params = params.set('siteId', filter.siteId);
    if (filter.location) params = params.set('location', filter.location);

    if (filter.registrationRequired !== undefined) {
      params = params.set('registrationRequired', filter.registrationRequired.toString());
    }
    if (filter.registrationOpen !== undefined) {
      params = params.set('registrationOpen', filter.registrationOpen.toString());
    }
    if (filter.isRecurring !== undefined) {
      params = params.set('isRecurring', filter.isRecurring.toString());
    }

    if (filter.startDateFrom) params = params.set('startDateFrom', filter.startDateFrom);
    if (filter.startDateTo) params = params.set('startDateTo', filter.startDateTo);
    if (filter.endDateFrom) params = params.set('endDateFrom', filter.endDateFrom);
    if (filter.endDateTo) params = params.set('endDateTo', filter.endDateTo);
    if (filter.createdFrom) params = params.set('createdFrom', filter.createdFrom);
    if (filter.createdTo) params = params.set('createdTo', filter.createdTo);

    if (filter.minPrice !== undefined) params = params.set('minPrice', filter.minPrice.toString());
    if (filter.maxPrice !== undefined) params = params.set('maxPrice', filter.maxPrice.toString());
    if (filter.minAttendees !== undefined) params = params.set('minAttendees', filter.minAttendees.toString());
    if (filter.maxAttendees !== undefined) params = params.set('maxAttendees', filter.maxAttendees.toString());

    return params;
  }
}
