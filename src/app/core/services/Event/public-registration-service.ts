// src/app/core/services/Events/public-registration.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PublicEventDetails, EventPublicRegistrationPayload, EventPublicRegistrationResponse, RegistrationStatusResponse } from '../../models/Events/event.model';


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
}
