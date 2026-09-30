import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/Common/api-response.model';

export interface SettingItem {
  id?: string;
  code: string;
  label: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  metadata?: Record<string, unknown>;
  usageCount?: number;
}

/** Types de paramètres (clé = segment d'API). */
export const SETTINGS_TYPES: { key: string; label: string; icon: string }[] = [
  { key: 'member-statuses', label: 'Statuts de membre', icon: 'bx-user-check' },
  { key: 'offering-categories', label: "Catégories d'offrandes", icon: 'bx-category' },
  { key: 'age-ranges', label: "Tranches d'âge", icon: 'bx-calendar' },
  { key: 'visitor-types', label: 'Types de visiteurs', icon: 'bx-group' },
  { key: 'international-countries', label: 'Pays internationaux', icon: 'bx-world' },
  { key: 'currencies', label: 'Devises', icon: 'bx-dollar-circle' },
];

/**
 * Paramètres configurables (statuts, catégories, âges, visiteurs, pays,
 * devises). Le serveur refuse la suppression d'un élément utilisé (désactivation
 * seulement) et trace chaque modification. (RG-P3-1)
 */
@Injectable({ providedIn: 'root' })
export class Settings {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/Settings`;

  constructor(private http: HttpClient) {}

  list(type: string): Observable<ApiResponse<SettingItem[]>> {
    return this.http.get<ApiResponse<SettingItem[]>>(`${this.baseUrl}/${type}`);
  }

  create(type: string, item: SettingItem): Observable<ApiResponse<SettingItem>> {
    return this.http.post<ApiResponse<SettingItem>>(`${this.baseUrl}/${type}`, item);
  }

  update(type: string, id: string, item: SettingItem): Observable<ApiResponse<SettingItem>> {
    return this.http.put<ApiResponse<SettingItem>>(`${this.baseUrl}/${type}/${id}`, item);
  }

  setActive(type: string, id: string, active: boolean): Observable<ApiResponse<SettingItem>> {
    const params = new HttpParams().set('active', active.toString());
    return this.http.put<ApiResponse<SettingItem>>(`${this.baseUrl}/${type}/${id}/active`, {}, { params });
  }

  delete(type: string, id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${type}/${id}`);
  }
}
