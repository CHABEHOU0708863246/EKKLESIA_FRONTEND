import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/Common/api-response.model';

/** Références métier pointant vers un site. */
export interface SiteReferenceCounts {
  members: number;
  services: number;
  offerings: number;
  events: number;
  cellGroups: number;
  departments: number;
  expenses: number;
  budgets: number;
  sermons: number;
  pastoralActs: number;
  pastorAppointments: number;
  properties: number;
  contracts: number;
  employees: number;
  contents: number;
  users: number;
  total: number;
  hasReferences: boolean;
}

export interface SiteReferences {
  siteId: string;
  siteName: string;
  churchId: string;
  existsInCollection: boolean;
  references: SiteReferenceCounts;
  canDelete: boolean;
}

export interface OrphanSite { siteId: string; references: number; }

export interface StructureAudit {
  churchId?: string;
  sitesCount: number;
  orphanSitesCount: number;
  sites: SiteReferences[];
  orphans: OrphanSite[];
  warnings: string[];
}

export interface SitePurgeRequest {
  siteIds: string[];
  /** Réaffecte les références à ce site avant suppression (sinon blocage). */
  remapToSiteId?: string;
}

export interface BlockedSite { siteId: string; reason: string; references: SiteReferenceCounts; }

export interface StructurePurgeResult {
  dryRun: boolean;
  deletedSiteIds: string[];
  remappedSiteIds: string[];
  blocked: BlockedSite[];
  steps: string[];
}

/**
 * Structure (église → sites) : contrôle des références et purge GARDÉE côté
 * serveur. Aucune donnée métier n'est supprimée par le front. (RG-P1-2)
 */
@Injectable({ providedIn: 'root' })
export class Structure {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/Structure`;

  constructor(private http: HttpClient) {}

  getSiteReferences(siteId: string): Observable<ApiResponse<SiteReferences>> {
    return this.http.get<ApiResponse<SiteReferences>>(`${this.baseUrl}/sites/${siteId}/references`);
  }

  getAudit(churchId?: string): Observable<ApiResponse<StructureAudit>> {
    let params = new HttpParams();
    if (churchId) params = params.set('churchId', churchId);
    return this.http.get<ApiResponse<StructureAudit>>(`${this.baseUrl}/audit`, { params });
  }

  /** Purge de sites. dryRun=true (défaut) : simulation, aucune écriture. */
  purgeSites(request: SitePurgeRequest, dryRun = true): Observable<ApiResponse<StructurePurgeResult>> {
    const params = new HttpParams().set('dryRun', dryRun.toString());
    return this.http.post<ApiResponse<StructurePurgeResult>>(`${this.baseUrl}/purge-sites`, request, { params });
  }
}
