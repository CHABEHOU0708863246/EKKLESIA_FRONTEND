import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/Common/api-response.model';
import { MyScope } from '../../models/Auth/my-scope.model';

/**
 * Périmètre de l'utilisateur connecté (rôles + sites + zones gérés).
 * GET /api/v1/Auth/me/scope
 */
@Injectable({ providedIn: 'root' })
export class MyScopeService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/v1/Auth/me/scope`;

  getMyScope(): Observable<ApiResponse<MyScope>> {
    return this.http.get<ApiResponse<MyScope>>(this.url);
  }
}
