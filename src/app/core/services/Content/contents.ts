// src/app/core/services/Communication/content.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/Common/api-response.model';
import {
  ContentCreate,
  ContentUpdate,
  ContentPublish,
  ContentFilter,
  DEFAULT_CONTENT_FILTER,
  ContentListResponse,
  ContentSummary,
} from '../../models/Communication/content.model';

interface ContentFileUploadResult {
  success: boolean;
  fileId?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})





export class Contents {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/Content`;

  constructor(private http: HttpClient) {}

  // ──────────────────────────────────────────────────────────────
  // 📝 CRUD
  // ──────────────────────────────────────────────────────────────

  /**
   * Crée un nouveau contenu
   * POST /api/v1/Content
   */
  create(contentData: ContentCreate): Observable<ApiResponse<ContentListResponse>> {
    return this.http.post<ApiResponse<ContentListResponse>>(this.baseUrl, contentData);
  }

  /**
   * Récupère un contenu par son ID
   * GET /api/v1/Content/{id}
   */
  getById(id: string): Observable<ApiResponse<ContentListResponse>> {
    return this.http.get<ApiResponse<ContentListResponse>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Récupère la liste paginée des contenus avec filtres
   * GET /api/v1/Content
   */
  getAll(filter: ContentFilter = DEFAULT_CONTENT_FILTER): Observable<ApiResponse<ContentListResponse>> {
    const params = this.buildFilterParams(filter);
    return this.http.get<ApiResponse<ContentListResponse>>(this.baseUrl, { params });
  }

  /**
   * Met à jour un contenu
   * PUT /api/v1/Content/{id}
   */
  update(id: string, contentData: ContentUpdate): Observable<ApiResponse<ContentListResponse>> {
    return this.http.put<ApiResponse<ContentListResponse>>(`${this.baseUrl}/${id}`, contentData);
  }

  /**
   * Supprime un contenu
   * DELETE /api/v1/Content/{id}
   */
  delete(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }

  // ──────────────────────────────────────────────────────────────
  // 📢 PUBLICATION
  // ──────────────────────────────────────────────────────────────

  /**
   * Publie ou dépublie un contenu
   * PUT /api/v1/Content/{id}/publish
   */
  publish(id: string, request: ContentPublish): Observable<ApiResponse<ContentListResponse>> {
    return this.http.put<ApiResponse<ContentListResponse>>(`${this.baseUrl}/${id}/publish`, request);
  }

  // ──────────────────────────────────────────────────────────────
  // 📊 STATISTIQUES D'USAGE
  // ──────────────────────────────────────────────────────────────

  /**
   * Incrémente le compteur de vues d'un contenu
   * PUT /api/v1/Content/{id}/view
   */
  incrementViews(id: string): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/${id}/view`, {});
  }

  /**
   * Incrémente le compteur de téléchargements d'un contenu
   * PUT /api/v1/Content/{id}/download
   */
  incrementDownloads(id: string): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/${id}/download`, {});
  }

  // ──────────────────────────────────────────────────────────────
  // 📈 RÉSUMÉ & MISE EN AVANT
  // ──────────────────────────────────────────────────────────────

  /**
   * Récupère le résumé/statistiques des contenus
   * GET /api/v1/Content/summary
   */
  getSummary(churchId?: string): Observable<ApiResponse<ContentSummary>> {
    let params = new HttpParams();
    if (churchId) params = params.set('churchId', churchId);
    return this.http.get<ApiResponse<ContentSummary>>(`${this.baseUrl}/summary`, { params });
  }

  /**
   * Récupère les contenus mis en avant (featured)
   * GET /api/v1/Content/featured
   */
  getFeatured(churchId?: string, limit = 10): Observable<ApiResponse<ContentListResponse[]>> {
    let params = new HttpParams().set('limit', limit.toString());
    if (churchId) params = params.set('churchId', churchId);
    return this.http.get<ApiResponse<ContentListResponse[]>>(`${this.baseUrl}/featured`, { params });
  }

  // ──────────────────────────────────────────────────────────────
  // 📁 FICHIERS (upload / diffusion)
  // ──────────────────────────────────────────────────────────────

  /**
   * Upload le fichier principal d'un contenu (vidéo, audio, document…)
   * POST /api/v1/Content/{id}/file
   */
  uploadFile(contentId: string, file: File): Observable<ContentFileUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ContentFileUploadResult>(`${this.baseUrl}/${contentId}/file`, formData);
  }

  /**
   * Upload la miniature d'un contenu
   * POST /api/v1/Content/{id}/thumbnail
   */
  uploadThumbnail(contentId: string, file: File): Observable<ContentFileUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ContentFileUploadResult>(`${this.baseUrl}/${contentId}/thumbnail`, formData);
  }

  /**
   * Retourne l'URL complète pour afficher/télécharger un fichier
   * (à utiliser dans un [src] ou un lien <a href>)
   */
  getFileUrl(fileId: string): string {
    if (!fileId) return '';
    return `${this.baseUrl}/files/${fileId}`;
  }

  /**
   * Récupère un fichier en Blob (nécessaire pour les fichiers protégés
   * par authentification — voir auth.interceptor.ts : une balise <img>
   * ou <a href> brute ne transmet pas le token Bearer)
   * GET /api/v1/Content/files/{fileId}
   */
  getFile(fileId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/files/${fileId}`, { responseType: 'blob' });
  }

  // ──────────────────────────────────────────────────────────────
  // 🛠️ MÉTHODES PRIVÉES
  // ──────────────────────────────────────────────────────────────

  private buildFilterParams(filter: ContentFilter): HttpParams {
    let params = new HttpParams()
      .set('page', (filter.page ?? 1).toString())
      .set('pageSize', (filter.pageSize ?? 20).toString());

    if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter.sortOrder) params = params.set('sortOrder', filter.sortOrder);

    if (filter.title) params = params.set('title', filter.title);
    if (filter.type) params = params.set('type', filter.type);
    if (filter.types?.length) {
      filter.types.forEach((t) => (params = params.append('types', t)));
    }

    if (filter.speaker) params = params.set('speaker', filter.speaker);
    if (filter.bibleVerse) params = params.set('bibleVerse', filter.bibleVerse);
    if (filter.series) params = params.set('series', filter.series);
    if (filter.tag) params = params.set('tag', filter.tag);

    if (filter.isPublished !== undefined) params = params.set('isPublished', filter.isPublished.toString());
    if (filter.isFeatured !== undefined) params = params.set('isFeatured', filter.isFeatured.toString());

    if (filter.churchId) params = params.set('churchId', filter.churchId);
    if (filter.siteId) params = params.set('siteId', filter.siteId);
    if (filter.createdBy) params = params.set('createdBy', filter.createdBy);

    if (filter.createdFrom) params = params.set('createdFrom', filter.createdFrom);
    if (filter.createdTo) params = params.set('createdTo', filter.createdTo);
    if (filter.publishedFrom) params = params.set('publishedFrom', filter.publishedFrom);
    if (filter.publishedTo) params = params.set('publishedTo', filter.publishedTo);

    if (filter.minViews !== undefined) params = params.set('minViews', filter.minViews.toString());
    if (filter.maxViews !== undefined) params = params.set('maxViews', filter.maxViews.toString());
    if (filter.minDownloads !== undefined) params = params.set('minDownloads', filter.minDownloads.toString());
    if (filter.maxDownloads !== undefined) params = params.set('maxDownloads', filter.maxDownloads.toString());

    return params;
  }
}
