import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/Common/api-response.model';

export interface DepartmentMember {
  id: string;
  fullName: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  churchId?: string;
  siteId?: string;
  leaderMemberIds: string[];
  memberIds: string[];
  leaders: DepartmentMember[];
  members: DepartmentMember[];
  memberCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface DepartmentPayload {
  name: string;
  description?: string;
  siteId?: string;
  leaderMemberIds?: string[];
}

@Injectable({ providedIn: 'root' })
export class Departments {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/Department`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<Department[]>> {
    return this.http.get<ApiResponse<Department[]>>(this.baseUrl);
  }

  create(payload: DepartmentPayload): Observable<ApiResponse<Department>> {
    return this.http.post<ApiResponse<Department>>(this.baseUrl, payload);
  }

  update(id: string, payload: DepartmentPayload): Observable<ApiResponse<Department>> {
    return this.http.put<ApiResponse<Department>>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }

  assignMember(id: string, memberId: string): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/${id}/members/${memberId}`, {});
  }

  removeMember(id: string, memberId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}/members/${memberId}`);
  }
}
