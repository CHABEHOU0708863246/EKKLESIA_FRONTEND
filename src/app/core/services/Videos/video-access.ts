import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/Common/api-response.model';

export interface VideoAccessCode {
  id: string;
  code: string;
  platform: string;
  url: string;
  status: string;
  expiresAt?: string | null;
  createdAt: string;
}

export interface VideoAccessState {
  enabled: boolean;
  items: VideoAccessCode[];
}

/** Squelette « Vidéo » (Lot 10) — désactivable côté serveur par feature flag. */
@Injectable({ providedIn: 'root' })
export class VideoAccess {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/VideoAccessCode`;

  constructor(private http: HttpClient) {}

  getState(): Observable<ApiResponse<VideoAccessState>> {
    return this.http.get<ApiResponse<VideoAccessState>>(this.baseUrl);
  }

  generate(payload: { platform: string; url: string; expiresAt?: string | null }): Observable<ApiResponse<VideoAccessCode>> {
    return this.http.post<ApiResponse<VideoAccessCode>>(this.baseUrl, payload);
  }

  revoke(id: string): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
