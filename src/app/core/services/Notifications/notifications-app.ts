// src/app/core/services/Notifications/notifications-app.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/Common/api-response.model';
import {
  AppNotification,
  AppNotificationListResponse,
  AppNotificationUnreadCount,
  AppNotificationCreate,
  AppNotificationCreationResult,
  AppNotificationPreferences
} from '../../models/Notifications/app-notification.model';

/**
 * Notifications in-app (cloche + page « Mes notifications »).
 * Le canal email est traité côté serveur (worker de dispatch).
 */
@Injectable({ providedIn: 'root' })
export class AppNotifications {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/Notification`;

  constructor(private http: HttpClient) {}

  /** Mes notifications (paginées, filtre non-lues). */
  getMine(unreadOnly = false, page = 1, pageSize = 20): Observable<ApiResponse<AppNotificationListResponse>> {
    const params = new HttpParams()
      .set('unreadOnly', unreadOnly.toString())
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http
      .get<ApiResponse<AppNotificationListResponse>>(`${this.baseUrl}/mine`, { params })
      .pipe(catchError(this.handleError<AppNotificationListResponse>('getMine')));
  }

  /** Compteur de non-lues (badge de la cloche). */
  getUnreadCount(): Observable<ApiResponse<AppNotificationUnreadCount>> {
    return this.http
      .get<ApiResponse<AppNotificationUnreadCount>>(`${this.baseUrl}/unread-count`)
      .pipe(catchError(this.handleError<AppNotificationUnreadCount>('getUnreadCount')));
  }

  markRead(id: string): Observable<ApiResponse<boolean>> {
    return this.http
      .put<ApiResponse<boolean>>(`${this.baseUrl}/${id}/read`, {})
      .pipe(catchError(this.handleError<boolean>('markRead')));
  }

  markAllRead(): Observable<ApiResponse<number>> {
    return this.http
      .put<ApiResponse<number>>(`${this.baseUrl}/read-all`, {})
      .pipe(catchError(this.handleError<number>('markAllRead')));
  }

  delete(id: string): Observable<ApiResponse<boolean>> {
    return this.http
      .delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.handleError<boolean>('delete')));
  }

  /** Préférences (canaux activés). */
  getPreferences(): Observable<ApiResponse<AppNotificationPreferences>> {
    return this.http
      .get<ApiResponse<AppNotificationPreferences>>(`${this.baseUrl}/preferences`)
      .pipe(catchError(this.handleError<AppNotificationPreferences>('getPreferences')));
  }

  savePreferences(prefs: AppNotificationPreferences): Observable<ApiResponse<AppNotificationPreferences>> {
    return this.http
      .put<ApiResponse<AppNotificationPreferences>>(`${this.baseUrl}/preferences`, prefs)
      .pipe(catchError(this.handleError<AppNotificationPreferences>('savePreferences')));
  }

  /** Envoi ciblé (permission Notification_Send). */
  send(payload: AppNotificationCreate): Observable<ApiResponse<AppNotificationCreationResult>> {
    return this.http
      .post<ApiResponse<AppNotificationCreationResult>>(this.baseUrl, payload)
      .pipe(catchError(this.handleError<AppNotificationCreationResult>('send')));
  }

  private handleError<T>(operation = 'operation') {
    return (error: any): Observable<ApiResponse<T>> => {
      const response: ApiResponse<T> = {
        success: false,
        message: error?.error?.message || error?.message || 'Une erreur est survenue',
        data: null as any,
        errors: error?.error?.errors || []
      };
      return new Observable<ApiResponse<T>>((observer) => {
        observer.next(response);
        observer.complete();
      });
    };
  }
}
