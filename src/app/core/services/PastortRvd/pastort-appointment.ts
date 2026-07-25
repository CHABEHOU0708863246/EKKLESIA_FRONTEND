import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Appointment,
  AppointmentStatus,
  AppointmentCreate,
  AppointmentFilter,
  AppointmentListResponse,
  DEFAULT_APPOINTMENT_FILTER,
  AppointmentUpdate,
} from '../../models/Pastor/appointment.model';

@Injectable({
  providedIn: 'root',
})
export class PastorAppointmentService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = `${environment.apiUrl}/api/v1/PastorAppointment`;

  private readonly _appointments = signal<Appointment[]>([]);
  private readonly _selectedAppointment = signal<Appointment | null>(null);
  private readonly _totalCount = signal<number>(0);
  private readonly _currentPage = signal<number>(1);
  private readonly _totalPages = signal<number>(1);
  private readonly _pageSize = signal<number>(20);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  readonly appointments = this._appointments.asReadonly();
  readonly selectedAppointment = this._selectedAppointment.asReadonly();
  readonly totalCount = this._totalCount.asReadonly();
  readonly currentPage = this._currentPage.asReadonly();
  readonly totalPages = this._totalPages.asReadonly();
  readonly pageSize = this._pageSize.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly hasAppointments = computed(() => this._appointments().length > 0);
  readonly upcomingAppointments = computed(() =>
    this._appointments().filter(
      (a) => a.isUpcoming && a.status !== AppointmentStatus.Cancelled
    )
  );

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  // ============================================================
  // CRUD — le backend renvoie le DTO directement, sans wrapper.
  // Les erreurs (success:false) arrivent en 400/404 via catchError.
  // ============================================================

  createAppointment(payload: AppointmentCreate): Observable<Appointment> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.post<Appointment>(this.apiUrl, payload).pipe(
      tap((data) => {
        this._appointments.update((list) => [data, ...list]);
        this._loading.set(false);
      }),
      catchError((err) => this.handleError(err))
    );
  }

  getAppointmentById(id: string): Observable<Appointment> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<Appointment>(`${this.apiUrl}/${id}`).pipe(
      tap((data) => {
        this._selectedAppointment.set(data);
        this._loading.set(false);
      }),
      catchError((err) => this.handleError(err))
    );
  }

  getAppointments(
    filter: Partial<AppointmentFilter> = {}
  ): Observable<AppointmentListResponse> {
    this._loading.set(true);
    this._error.set(null);

    const finalFilter: AppointmentFilter = { ...DEFAULT_APPOINTMENT_FILTER, ...filter };
    const params = this.buildHttpParams(finalFilter);

    return this.http
      .get<AppointmentListResponse>(this.apiUrl, { params })
      .pipe(
        tap((result) => {
          this._appointments.set(result.items);
          this._totalCount.set(result.totalCount);
          this._currentPage.set(result.currentPage);
          this._totalPages.set(result.totalPages);
          this._pageSize.set(result.pageSize);
          this._loading.set(false);
        }),
        catchError((err) => this.handleError(err))
      );
  }

  updateAppointment(id: string, payload: AppointmentUpdate): Observable<Appointment> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.put<Appointment>(`${this.apiUrl}/${id}`, payload).pipe(
      tap((data) => {
        this._appointments.update((list) =>
          list.map((a) => (a.id === id ? data : a))
        );
        if (this._selectedAppointment()?.id === id) {
          this._selectedAppointment.set(data);
        }
        this._loading.set(false);
      }),
      catchError((err) => this.handleError(err))
    );
  }

  deleteAppointment(id: string): Observable<void> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this._appointments.update((list) => list.filter((a) => a.id !== id));
        if (this._selectedAppointment()?.id === id) {
          this._selectedAppointment.set(null);
        }
        this._loading.set(false);
      }),
      catchError((err) => this.handleError(err))
    );
  }

  updateStatus(id: string, newStatus: AppointmentStatus): Observable<Appointment> {
    this._loading.set(true);
    this._error.set(null);

    return this.http
      .put<Appointment>(
        `${this.apiUrl}/${id}/status`,
        JSON.stringify(newStatus),
        { headers: { 'Content-Type': 'application/json' } }
      )
      .pipe(
        tap((data) => {
          this._appointments.update((list) =>
            list.map((a) => (a.id === id ? data : a))
          );
          if (this._selectedAppointment()?.id === id) {
            this._selectedAppointment.set(data);
          }
          this._loading.set(false);
        }),
        catchError((err) => this.handleError(err))
      );
  }

  getAppointmentsByPastor(
    pastorId: string,
    upcomingOnly?: boolean
  ): Observable<AppointmentListResponse> {
    this._loading.set(true);
    this._error.set(null);

    let params = new HttpParams();
    if (upcomingOnly !== undefined) {
      params = params.set('upcomingOnly', String(upcomingOnly));
    }

    return this.http
      .get<AppointmentListResponse>(`${this.apiUrl}/by-pastor/${pastorId}`, { params })
      .pipe(
        tap((result) => {
          this._appointments.set(result.items);
          this._totalCount.set(result.totalCount);
          this._loading.set(false);
        }),
        catchError((err) => this.handleError(err))
      );
  }

  getAppointmentsByMember(memberId: string): Observable<AppointmentListResponse> {
    this._loading.set(true);
    this._error.set(null);

    return this.http
      .get<AppointmentListResponse>(`${this.apiUrl}/by-member/${memberId}`)
      .pipe(
        tap((result) => {
          this._appointments.set(result.items);
          this._totalCount.set(result.totalCount);
          this._loading.set(false);
        }),
        catchError((err) => this.handleError(err))
      );
  }

  // ============================================================
  // HELPERS
  // ============================================================

  selectAppointment(appointment: Appointment | null): void {
    this._selectedAppointment.set(appointment);
  }

  reset(): void {
    this._appointments.set([]);
    this._selectedAppointment.set(null);
    this._totalCount.set(0);
    this._currentPage.set(1);
    this._totalPages.set(1);
    this._error.set(null);
  }

  private buildHttpParams(filter: AppointmentFilter): HttpParams {
    let params = new HttpParams();

    Object.entries(filter).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;

      if (Array.isArray(value)) {
        value.forEach((v) => (params = params.append(key, String(v))));
      } else {
        params = params.set(key, String(value));
      }
    });

    return params;
  }

  setPage(page: number): void {
  this._currentPage.set(page);
}

  private handleError(err: any) {
    const message =
      err?.error?.message || err?.error?.errorMessage || 'Une erreur est survenue.';
    this._error.set(message);
    this._loading.set(false);
    return throwError(() => err);
  }
}
