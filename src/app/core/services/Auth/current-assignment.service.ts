// src/app/core/services/Auth/current-assignment.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/Common/api-response.model';
import { MyScope } from '../../models/Auth/my-scope.model';

/** Affectation de l'utilisateur connecté (église + site), pour préremplir les formulaires. */
export interface CurrentAssignment {
  churchId: string | null;
  siteId: string | null;
  churchName: string | null;
  siteName: string | null;
  isGlobalScope: boolean;
}

/**
 * Récupère (et met en cache) l'église + le site de l'utilisateur connecté
 * via GET /api/v1/Auth/me/scope. Utilisé par les formulaires de création pour
 * préremplir automatiquement l'église et le site, sans ressaisie.
 */
@Injectable({ providedIn: 'root' })
export class CurrentAssignmentService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/v1/Auth/me/scope`;
  private cache$?: Observable<CurrentAssignment>;

  get(): Observable<CurrentAssignment> {
    if (!this.cache$) {
      this.cache$ = this.http.get<ApiResponse<MyScope>>(this.url).pipe(
        map((res) => {
          const s: MyScope | undefined = (res as any)?.data ?? (res as any);
          return {
            churchId: s?.churchId ?? null,
            siteId: s?.siteId ?? null,
            churchName: s?.churchName ?? null,
            siteName: s?.siteName ?? null,
            isGlobalScope: !!s?.isGlobalScope,
          } as CurrentAssignment;
        }),
        catchError(() =>
          of({ churchId: null, siteId: null, churchName: null, siteName: null, isGlobalScope: false })
        ),
        shareReplay(1)
      );
    }
    return this.cache$;
  }

  /** Invalide le cache (après changement d'affectation, reconnexion…). */
  clear(): void {
    this.cache$ = undefined;
  }
}
