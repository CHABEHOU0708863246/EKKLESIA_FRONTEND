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
  DEFAULT_EVENT_FILTER
} from '../../models/Events/event.model';
import { ApiResponse } from '../../models/Common/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class Events {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/Event`;

  constructor(private http: HttpClient) {}

  // ──────────────────────────────────────────────────────────────
  // 📝 CRUD
  // ──────────────────────────────────────────────────────────────

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
  getById(id: string): Observable<ApiResponse<Event>> {
    return this.http.get<ApiResponse<Event>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Récupère la liste paginée des événements avec filtres
   * GET /api/v1/Event
   */
  getAll(filter: EventFilter = DEFAULT_EVENT_FILTER): Observable<ApiResponse<EventListResponse>> {
    const params = this.buildFilterParams(filter);
    return this.http.get<ApiResponse<EventListResponse>>(this.baseUrl, { params });
  }

  /**
   * Récupère les événements à venir
   * GET /api/v1/Event/upcoming
   */
  getUpcoming(churchId?: string, limit: number = 10): Observable<ApiResponse<Event[]>> {
    let params = new HttpParams()
      .set('limit', limit.toString());

    if (churchId) params = params.set('churchId', churchId);

    return this.http.get<ApiResponse<Event[]>>(`${this.baseUrl}/upcoming`, { params });
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
  delete(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }

  // ──────────────────────────────────────────────────────────────
  // 👤 INSCRIPTIONS & CHECK-IN
  // ──────────────────────────────────────────────────────────────

  /**
   * Inscrire un participant à un événement
   * POST /api/v1/Event/{id}/register
   */
  registerAttendee(eventId: string, registration: EventAttendeeRegister): Observable<ApiResponse<Event>> {
    return this.http.post<ApiResponse<Event>>(`${this.baseUrl}/${eventId}/register`, registration);
  }

  /**
   * Désinscrire un participant
   * DELETE /api/v1/Event/{id}/register/{attendeeIdentifier}
   */
  unregisterAttendee(eventId: string, attendeeIdentifier: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${eventId}/register/${attendeeIdentifier}`);
  }

  /**
   * Effectuer le check-in d'un participant
   * POST /api/v1/Event/checkin
   */
  checkInAttendee(checkInData: EventAttendeeCheckIn): Observable<ApiResponse<Event>> {
    return this.http.post<ApiResponse<Event>>(`${this.baseUrl}/checkin`, checkInData);
  }

  // ──────────────────────────────────────────────────────────────
  // 📊 STATISTIQUES (optionnel)
  // ──────────────────────────────────────────────────────────────

  /**
   * Récupère le résumé des événements
   * GET /api/v1/Event/summary
   */
  getSummary(churchId?: string): Observable<ApiResponse<EventSummary>> {
    let params = new HttpParams();
    if (churchId) params = params.set('churchId', churchId);
    return this.http.get<ApiResponse<EventSummary>>(`${this.baseUrl}/summary`, { params });
  }

  // ──────────────────────────────────────────────────────────────
  // 🛠️ MÉTHODES PRIVÉES
  // ──────────────────────────────────────────────────────────────

  /**
   * Construit les paramètres de requête à partir du filtre
   */
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
