// zone.utils.ts

import { Zone, ZoneResponse, ZoneFilter } from './zone.model';

/**
 * Jours de la semaine (si besoin, mais pas directement pour Zone)
 * On peut ajouter des constantes générales ici si nécessaire.
 */

/**
 * Valeurs par défaut pour le filtre
 */
export const DEFAULT_ZONE_FILTER: ZoneFilter = {
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
};

/**
 * Classe utilitaire pour les zones
 */
export class ZoneUtils {

  /**
   * Formate une date (avec heure)
   */
  static formatDate(date?: string): string {
    if (!date) return 'Non renseigné';
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Formate une date (sans heure)
   */
  static formatDateOnly(date?: string): string {
    if (!date) return 'Non renseigné';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Obtient le badge de statut
   */
  static getStatusBadge(isActive: boolean): { label: string; color: string } {
    return isActive
      ? { label: 'Active', color: 'success' }
      : { label: 'Inactive', color: 'danger' };
  }

  /**
   * Obtient le libellé du nombre de sites
   */
  static getSiteCountLabel(siteCount: number): string {
    if (siteCount === 0) return 'Aucun site';
    if (siteCount === 1) return '1 site';
    return `${siteCount} sites`;
  }

  /**
   * Obtient les initiales du nom de la zone
   */
  static getInitials(name: string): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /**
   * Filtre les zones par recherche
   */
  static searchZones(zones: Zone[], searchTerm: string): Zone[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return zones;

    return zones.filter(zone =>
      zone.name.toLowerCase().includes(term) ||
      (zone.churchId && zone.churchId.toLowerCase().includes(term)) ||
      (zone.chiefUserId && zone.chiefUserId.toLowerCase().includes(term))
    );
  }

  /**
   * Crée une zone vide
   */
  static createEmpty(): Zone {
    return {
      id: '',
      name: '',
      churchId: undefined,
      chiefUserId: '',
      siteIds: [],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: undefined,
      createdBy: ''
    };
  }

  /**
   * Trie les zones par nombre de sites (descendant)
   */
  static sortBySiteCount(zones: Zone[]): Zone[] {
    return [...zones].sort((a, b) => (b.siteIds?.length || 0) - (a.siteIds?.length || 0));
  }

  /**
   * Groupe les zones par église
   */
  static groupByChurch(zones: Zone[]): Record<string, Zone[]> {
    const groups: Record<string, Zone[]> = {};
    zones.forEach(zone => {
      const churchId = zone.churchId || 'Non spécifié';
      if (!groups[churchId]) groups[churchId] = [];
      groups[churchId].push(zone);
    });
    return groups;
  }

  /**
   * Vérifie si un site appartient à une zone
   */
  static hasSite(zone: Zone, siteId: string): boolean {
    return zone.siteIds?.includes(siteId) ?? false;
  }

  /**
   * Ajoute un site à la zone (immutable, retourne une nouvelle copie)
   */
  static addSite(zone: Zone, siteId: string): Zone {
    if (zone.siteIds.includes(siteId)) return zone;
    return {
      ...zone,
      siteIds: [...zone.siteIds, siteId]
    };
  }

  /**
   * Retire un site de la zone (immutable)
   */
  static removeSite(zone: Zone, siteId: string): Zone {
    return {
      ...zone,
      siteIds: zone.siteIds.filter(id => id !== siteId)
    };
  }

  /**
   * Enrichit une zone avec des noms (à utiliser après avoir récupéré les données de Church, User, Site)
   */
  static enrichZone(
    zone: Zone,
    churchName?: string,
    chiefUserName?: string,
    chiefUserEmail?: string,
    siteNames?: string[]
  ): ZoneResponse {
    return {
      ...zone,
      churchName: churchName,
      chiefUserName: chiefUserName,
      chiefUserEmail: chiefUserEmail,
      siteNames: siteNames || [],
      siteCount: zone.siteIds?.length || 0,
      formattedCreatedAt: ZoneUtils.formatDate(zone.createdAt),
      formattedUpdatedAt: ZoneUtils.formatDate(zone.updatedAt)
    };
  }
}
