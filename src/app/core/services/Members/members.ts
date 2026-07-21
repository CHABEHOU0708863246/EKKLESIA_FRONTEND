// src/app/core/services/Members/member.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Member,
  MemberCreate,
  MemberUpdate,
  MemberFilter,
  MemberListResponse,
  MemberSummary,
  MemberExportFilter, // ✅ NOUVEAU
  DEFAULT_MEMBER_FILTER
} from '../../models/Members/member.model';
import {
  CellGroup,
  CellGroupCreate,
  CellGroupUpdate,
  CellGroupListResponse
} from '../../models/Members/cell-group.model';
import {
  CellGroupAttendance,
  CellGroupAttendanceCreate,
  CellGroupAttendanceUpdate,
  CellGroupAttendanceListResponse
} from '../../models/Members/cell-group-attendance.model';
import {
  PastoralNote,
  PastoralNoteCreate,
  PastoralNoteUpdate,
  PastoralNoteListResponse
} from '../../models/Members/pastoral-note.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Members {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/Member`;

  constructor(private http: HttpClient) { }

  // ───────────────────────────────────────────────────────────────
  // MEMBRES
  // ───────────────────────────────────────────────────────────────

  /**
   * Met à jour la photo d'un membre existant
   * PUT /api/v1/Member/{id}/photo
   */
  updateMemberPhoto(id: string, photoFile: File): Observable<Member> {
    const formData = new FormData();
    formData.append('photoFile', photoFile, photoFile.name);
    return this.http.put<Member>(`${this.baseUrl}/${id}/photo`, formData);
  }

  /**
   * Crée un nouveau membre
   */
  createMember(member: MemberCreate): Observable<Member> {
    return this.http.post<Member>(this.baseUrl, member);
  }

  /**
   * Récupère un membre par son ID
   */
  getMemberById(id: string): Observable<Member> {
    return this.http.get<Member>(`${this.baseUrl}/${id}`);
  }

  /**
   * Récupère la liste paginée des membres avec filtres
   */
  getMembers(filter: MemberFilter = DEFAULT_MEMBER_FILTER): Observable<MemberListResponse> {
    const params = this.buildFilterParams(filter);
    return this.http.get<MemberListResponse>(this.baseUrl, { params });
  }

  /**
   * Met à jour un membre
   */
  updateMember(id: string, member: MemberUpdate): Observable<Member> {
    return this.http.put<Member>(`${this.baseUrl}/${id}`, member);
  }

  /**
   * Supprime un membre (soft delete)
   */
  deleteMember(id: string): Observable<Response> {
    return this.http.delete<Response>(`${this.baseUrl}/${id}`);
  }

  /**
   * Récupère le résumé des membres
   */
  getMemberSummary(churchId?: string): Observable<MemberSummary> {
    let params = new HttpParams();
    if (churchId) params = params.set('churchId', churchId);
    return this.http.get<MemberSummary>(`${this.baseUrl}/summary`, { params });
  }

  /**
   * Exporte les membres au format JSON (existant)
   */
  exportMembers(filter: MemberFilter, format: string = 'json'): Observable<Blob> {
    const params = this.buildFilterParams(filter).set('format', format);
    return this.http.get(`${this.baseUrl}/export`, {
      params,
      responseType: 'blob'
    });
  }

  // ───────────────────────────────────────────────────────────────
  // 📄 NOUVEAU - EXPORT PDF & EXCEL
  // ───────────────────────────────────────────────────────────────

  /**
   * Télécharge la fiche membre au format PDF
   * GET /api/v1/Member/{id}/card-pdf
   */
  exportMemberCard(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/card-pdf`, {
      responseType: 'blob'
    });
  }

  /**
   * Exporte la liste des membres en Excel avec filtres (période, église, site, statut)
   * POST /api/v1/Member/export-excel
   */
  exportMembersToExcel(filter: MemberExportFilter): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/export-excel`, filter, {
      responseType: 'blob'
    });
  }

  // ───────────────────────────────────────────────────────────────
  // 📸 PHOTO DU MEMBRE
  // ───────────────────────────────────────────────────────────────

  /**
   * Construit l'URL affichable d'une photo de membre stockée dans GridFS.
   * GET /api/v1/Member/photo/{photoId}
   * À utiliser directement dans un [src] d'<img>
   */
  getMemberPhotoUrl(photoId: string | undefined | null): string {
    if (!photoId || photoId === 'default-profile-photo') {
      return 'assets/images/default-avatar.png';
    }
    return `${this.baseUrl}/photo/${photoId}`;
  }

  // ───────────────────────────────────────────────────────────────
  // SUIVI VISITEURS
  // ───────────────────────────────────────────────────────────────

  /**
   * Met à jour l'étape du parcours d'un visiteur
   */
  updateVisitorStage(id: string, stage: string): Observable<Member> {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.put<Member>(
      `${this.baseUrl}/${id}/visitor-stage`,
      JSON.stringify(stage),
      { headers }
    );
  }

  /**
   * Récupère la liste des visiteurs par étape
   */
  getVisitorsByStage(stage?: string, churchId?: string): Observable<Member[]> {
    let params = new HttpParams();
    if (stage) params = params.set('stage', stage);
    if (churchId) params = params.set('churchId', churchId);
    return this.http.get<Member[]>(`${this.baseUrl}/visitors`, { params });
  }

  // ───────────────────────────────────────────────────────────────
  // CELLULES
  // ───────────────────────────────────────────────────────────────

  /**
   * Crée une nouvelle cellule
   */
  createCellGroup(cellGroup: CellGroupCreate): Observable<CellGroup> {
    return this.http.post<CellGroup>(`${this.baseUrl}/cell-group`, cellGroup);
  }

  /**
   * Récupère une cellule par son ID
   */
  getCellGroupById(id: string): Observable<CellGroup> {
    return this.http.get<CellGroup>(`${this.baseUrl}/cell-group/${id}`);
  }

  /**
   * Récupère la liste des cellules
   */
  getCellGroups(churchId?: string, isActive?: boolean): Observable<CellGroup[]> {
    let params = new HttpParams();
    if (churchId) params = params.set('churchId', churchId);
    if (isActive !== undefined) params = params.set('isActive', isActive.toString());
    return this.http.get<CellGroup[]>(`${this.baseUrl}/cell-group`, { params });
  }

  /**
   * Met à jour une cellule
   */
  updateCellGroup(id: string, cellGroup: CellGroupUpdate): Observable<CellGroup> {
    return this.http.put<CellGroup>(`${this.baseUrl}/cell-group/${id}`, cellGroup);
  }

  /**
   * Supprime une cellule
   */
  deleteCellGroup(id: string): Observable<Response> {
    return this.http.delete<Response>(`${this.baseUrl}/cell-group/${id}`);
  }

  /**
   * Ajoute des membres à une cellule
   */
  addMembersToCellGroup(id: string, memberIds: string[]): Observable<Response> {
    return this.http.post<Response>(`${this.baseUrl}/cell-group/${id}/members`, memberIds);
  }

  /**
   * Retire des membres d'une cellule
   */
  removeMembersFromCellGroup(id: string, memberIds: string[]): Observable<Response> {
    return this.http.delete<Response>(`${this.baseUrl}/cell-group/${id}/members`, {
      body: memberIds
    });
  }

  // ───────────────────────────────────────────────────────────────
  // PRÉSENCES EN CELLULE
  // ───────────────────────────────────────────────────────────────

  /**
   * Enregistre une présence en cellule
   */
  createAttendance(attendance: CellGroupAttendanceCreate): Observable<CellGroupAttendance> {
    return this.http.post<CellGroupAttendance>(`${this.baseUrl}/cell-group/attendance`, attendance);
  }

  /**
   * Met à jour une présence en cellule
   */
  updateAttendance(id: string, attendance: CellGroupAttendanceUpdate): Observable<CellGroupAttendance> {
    return this.http.put<CellGroupAttendance>(`${this.baseUrl}/cell-group/attendance/${id}`, attendance);
  }

  /**
   * Récupère l'historique des présences d'une cellule
   */
  getAttendances(cellGroupId: string, from?: string, to?: string): Observable<CellGroupAttendance[]> {
    let params = new HttpParams().set('cellGroupId', cellGroupId);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<CellGroupAttendance[]>(`${this.baseUrl}/cell-group/${cellGroupId}/attendance`, { params });
  }

  /**
   * Calcule le taux de fidélité d'une cellule
   */
  getCellGroupFidelityRate(cellGroupId: string, weeks: number = 4): Observable<number> {
    const params = new HttpParams().set('weeks', weeks.toString());
    return this.http.get<number>(`${this.baseUrl}/cell-group/${cellGroupId}/fidelity-rate`, { params });
  }

  // ───────────────────────────────────────────────────────────────
  // SUIVI PASTORAL
  // ───────────────────────────────────────────────────────────────

  /**
   * Crée une note pastorale
   */
  createPastoralNote(note: PastoralNoteCreate): Observable<PastoralNote> {
    return this.http.post<PastoralNote>(`${this.baseUrl}/pastoral-note`, note);
  }

  /**
   * Récupère les notes pastorales d'un membre
   */
  getPastoralNotesByMember(memberId: string, includeConfidential: boolean = false): Observable<PastoralNote[]> {
    const params = new HttpParams().set('includeConfidential', includeConfidential.toString());
    return this.http.get<PastoralNote[]>(`${this.baseUrl}/${memberId}/pastoral-notes`, { params });
  }

  /**
   * Met à jour une note pastorale
   */
  updatePastoralNote(id: string, note: PastoralNoteUpdate): Observable<PastoralNote> {
    return this.http.put<PastoralNote>(`${this.baseUrl}/pastoral-note/${id}`, note);
  }

  /**
   * Supprime une note pastorale
   */
  deletePastoralNote(id: string): Observable<Response> {
    return this.http.delete<Response>(`${this.baseUrl}/pastoral-note/${id}`);
  }

  // ───────────────────────────────────────────────────────────────
  // MÉTHODES PRIVÉES
  // ───────────────────────────────────────────────────────────────

  /**
   * Construit les paramètres de filtrage pour les membres
   */
  private buildFilterParams(filter: MemberFilter): HttpParams {
    let params = new HttpParams()
      .set('page', filter.page.toString())
      .set('pageSize', filter.pageSize.toString());

    if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter.sortOrder) params = params.set('sortOrder', filter.sortOrder);

    // Filtres textuels
    if (filter.firstName) params = params.set('firstName', filter.firstName);
    if (filter.lastName) params = params.set('lastName', filter.lastName);
    if (filter.fullName) params = params.set('fullName', filter.fullName);
    if (filter.phone) params = params.set('phone', filter.phone);
    if (filter.email) params = params.set('email', filter.email);

    // Filtres enum
    if (filter.status) params = params.set('status', filter.status);
    if (filter.spiritualStatus) params = params.set('spiritualStatus', filter.spiritualStatus);

    // Filtres booléens
    if (filter.isActive !== undefined) params = params.set('isActive', filter.isActive.toString());
    if (filter.isBaptized !== undefined) params = params.set('isBaptized', filter.isBaptized.toString());
    if (filter.isLeader !== undefined) params = params.set('isLeader', filter.isLeader.toString());

    // Filtres IDs
    if (filter.cellGroupId) params = params.set('cellGroupId', filter.cellGroupId);
    if (filter.ministryId) params = params.set('ministryId', filter.ministryId);
    if (filter.churchId) params = params.set('churchId', filter.churchId);
    if (filter.siteId) params = params.set('siteId', filter.siteId);
    if (filter.godfatherId) params = params.set('godfatherId', filter.godfatherId);

    // Filtres dates
    if (filter.baptizedFrom) params = params.set('baptizedFrom', filter.baptizedFrom);
    if (filter.baptizedTo) params = params.set('baptizedTo', filter.baptizedTo);
    if (filter.createdFrom) params = params.set('createdFrom', filter.createdFrom);
    if (filter.createdTo) params = params.set('createdTo', filter.createdTo);
    if (filter.lastAttendanceFrom) params = params.set('lastAttendanceFrom', filter.lastAttendanceFrom);
    if (filter.lastAttendanceTo) params = params.set('lastAttendanceTo', filter.lastAttendanceTo);

    // Filtres numériques
    if (filter.minAttendanceCount !== undefined) params = params.set('minAttendanceCount', filter.minAttendanceCount.toString());
    if (filter.maxAttendanceCount !== undefined) params = params.set('maxAttendanceCount', filter.maxAttendanceCount.toString());

    return params;
  }
}
