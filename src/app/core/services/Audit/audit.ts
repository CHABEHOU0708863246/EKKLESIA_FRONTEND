// src/app/core/services/Audit/audit.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/Common/api-response.model';
import {
  AuditLogListResponse,
  AuditLogDetail,
  AuditLogFilter,
  AuditStatistics
} from '../../models/Audit/audit.model';

/**
 * Journal d'audit (sécurité, modifications, traçabilité).
 * Backend : AuditController — policy CAN_READ_AUDIT.
 */
@Injectable({ providedIn: 'root' })
export class AuditServiceApi {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/Audit`;

  constructor(private http: HttpClient) {}

  getList(filter: AuditLogFilter = {}): Observable<ApiResponse<AuditLogListResponse>> {
    return this.http
      .get<ApiResponse<AuditLogListResponse>>(this.baseUrl, { params: this.buildParams(filter) })
      .pipe(catchError(this.handleError<AuditLogListResponse>('getList')));
  }

  getById(id: string): Observable<ApiResponse<AuditLogDetail>> {
    return this.http
      .get<ApiResponse<AuditLogDetail>>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.handleError<AuditLogDetail>('getById')));
  }

  getStatistics(): Observable<ApiResponse<AuditStatistics>> {
    return this.http
      .get<ApiResponse<AuditStatistics>>(`${this.baseUrl}/statistics`)
      .pipe(catchError(this.handleError<AuditStatistics>('getStatistics')));
  }

  private buildParams(filter: AuditLogFilter): HttpParams {
    let params = new HttpParams()
      .set('page', (filter.page ?? 1).toString())
      .set('pageSize', (filter.pageSize ?? 20).toString())
      .set('sortBy', filter.sortBy ?? 'Timestamp')
      .set('sortOrder', filter.sortOrder ?? 'desc');

    if (filter.userId) params = params.set('userId', filter.userId);
    if (filter.userFullName) params = params.set('userFullName', filter.userFullName);
    if (filter.entityType) params = params.set('entityType', filter.entityType);
    if (filter.entityIdentifier) params = params.set('entityIdentifier', filter.entityIdentifier);
    if (filter.searchTerm) params = params.set('searchTerm', filter.searchTerm);
    if (filter.startDate) params = params.set('startDate', filter.startDate);
    if (filter.endDate) params = params.set('endDate', filter.endDate);

    (filter.actions ?? []).forEach((a) => (params = params.append('actions', a)));
    (filter.categories ?? []).forEach((c) => (params = params.append('categories', c)));
    (filter.severities ?? []).forEach((s) => (params = params.append('severities', s)));

    return params;
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
