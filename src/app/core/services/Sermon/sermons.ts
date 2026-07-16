import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Sermon,
  SermonCreate,
  SermonUpdate,
  SermonAddMedia,
  SermonFilter,
  SermonListResponse,
  DEFAULT_SERMON_FILTER,
} from '../../models/Events/sermon.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Sermons {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/Sermon`;

  constructor(private http: HttpClient) {}

  // ───────────────────────────────────────────────────────────────
  // CRUD
  // ───────────────────────────────────────────────────────────────

  create(sermon: SermonCreate): Observable<Sermon> {
    return this.http.post<Sermon>(this.baseUrl, sermon);
  }

  getById(id: string): Observable<Sermon> {
    return this.http.get<Sermon>(`${this.baseUrl}/${id}`);
  }

  getAll(filter: SermonFilter = DEFAULT_SERMON_FILTER): Observable<SermonListResponse> {
    const params = this.buildFilterParams(filter);
    return this.http.get<SermonListResponse>(this.baseUrl, { params });
  }

  update(id: string, sermon: SermonUpdate): Observable<Sermon> {
    return this.http.put<Sermon>(`${this.baseUrl}/${id}`, sermon);
  }

  delete(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }

  // ───────────────────────────────────────────────────────────────
  // CYCLE DE VIE
  // ───────────────────────────────────────────────────────────────

  publish(id: string): Observable<Sermon> {
    return this.http.post<Sermon>(`${this.baseUrl}/${id}/publish`, {});
  }

  archive(id: string): Observable<Sermon> {
    return this.http.post<Sermon>(`${this.baseUrl}/${id}/archive`, {});
  }

  registerView(id: string): Observable<Sermon> {
    return this.http.post<Sermon>(`${this.baseUrl}/${id}/view`, {});
  }

  // ───────────────────────────────────────────────────────────────
  // MÉDIAS
  // ───────────────────────────────────────────────────────────────

  /**
   * Ajoute un média à un sermon. Pour Audio/Document, `payload.file` doit être fourni
   * (envoyé en multipart/form-data). Pour Video/Link, `payload.externalUrl` doit être fourni.
   */
  addMedia(sermonId: string, payload: SermonAddMedia): Observable<Sermon> {
    const formData = new FormData();
    formData.append('type', payload.type);
    if (payload.label) formData.append('label', payload.label);
    if (payload.externalUrl) formData.append('externalUrl', payload.externalUrl);
    if (payload.durationSeconds !== undefined) {
      formData.append('durationSeconds', payload.durationSeconds.toString());
    }
    if (payload.file) {
      formData.append('file', payload.file, payload.file.name);
    }
    return this.http.post<Sermon>(`${this.baseUrl}/${sermonId}/media`, formData);
  }

  removeMedia(sermonId: string, mediaId: string): Observable<Sermon> {
    return this.http.delete<Sermon>(`${this.baseUrl}/${sermonId}/media/${mediaId}`);
  }

  /**
   * Construit l'URL de téléchargement/streaming d'un média (audio ou document).
   * À utiliser directement dans un <audio src> ou <a href>, pas besoin d'appel HttpClient.
   */
  getMediaDownloadUrl(sermonId: string, mediaFileId: string): string {
    return `${this.baseUrl}/${sermonId}/media/${mediaFileId}/download`;
  }

  // ───────────────────────────────────────────────────────────────
  // SÉRIES
  // ───────────────────────────────────────────────────────────────

  getSeries(churchId?: string): Observable<string[]> {
    let params = new HttpParams();
    if (churchId) params = params.set('churchId', churchId);
    return this.http.get<string[]>(`${this.baseUrl}/series`, { params });
  }

  getBySeries(series: string, churchId?: string): Observable<Sermon[]> {
    let params = new HttpParams();
    if (churchId) params = params.set('churchId', churchId);
    return this.http.get<Sermon[]>(`${this.baseUrl}/series/${encodeURIComponent(series)}`, { params });
  }

  // ───────────────────────────────────────────────────────────────
  // MÉTHODES PRIVÉES
  // ───────────────────────────────────────────────────────────────

  private buildFilterParams(filter: SermonFilter): HttpParams {
    let params = new HttpParams()
      .set('page', filter.page.toString())
      .set('pageSize', filter.pageSize.toString());

    if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter.sortOrder) params = params.set('sortOrder', filter.sortOrder);

    if (filter.title) params = params.set('title', filter.title);
    if (filter.preacherId) params = params.set('preacherId', filter.preacherId);
    if (filter.preacherName) params = params.set('preacherName', filter.preacherName);
    if (filter.theme) params = params.set('theme', filter.theme);
    if (filter.series) params = params.set('series', filter.series);
    if (filter.tag) params = params.set('tag', filter.tag);
    if (filter.status) params = params.set('status', filter.status);
    if (filter.churchId) params = params.set('churchId', filter.churchId);
    if (filter.siteId) params = params.set('siteId', filter.siteId);
    if (filter.dateFrom) params = params.set('dateFrom', filter.dateFrom);
    if (filter.dateTo) params = params.set('dateTo', filter.dateTo);

    return params;
  }
}
