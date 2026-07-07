// src/app/core/models/churchs/church.model.ts
import { Address, AddressUtils, Site, SiteCreate, SiteUtils } from './site.model';
import { ChurchSettings } from './church-settings.model';

export interface Church {
  id: string;
  name: string;
  legalName?: string;
  email?: string;
  phone: string;
  address: Address;
  website?: string;
  logoUrl?: string;
  taxId?: string;
  registrationNumber?: string;
  foundedDate?: string;
  denomination?: string;
  missionStatement?: string;
  visionStatement?: string;
  isHeadquarters: boolean;
  parentChurchId?: string;
  parentChurchName?: string;
  sites: Site[];
  isActive: boolean;
  settings: ChurchSettings;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  siteCount: number;
}

export interface ChurchCreate {
  name: string;
  legalName?: string;
  email?: string;
  phone: string;
  address: Address;
  website?: string;
  logoUrl?: string;
  taxId?: string;
  registrationNumber?: string;
  foundedDate?: string;
  denomination?: string;
  missionStatement?: string;
  visionStatement?: string;
  isHeadquarters?: boolean;
  parentChurchId?: string;
  sites?: SiteCreate[];
  settings?: ChurchSettings;
}

export interface ChurchUpdate {
  name?: string;
  legalName?: string;
  email?: string;
  phone?: string;
  address?: Address;
  website?: string;
  logoUrl?: string;
  taxId?: string;
  registrationNumber?: string;
  foundedDate?: string;
  denomination?: string;
  missionStatement?: string;
  visionStatement?: string;
  isHeadquarters?: boolean;
  parentChurchId?: string;
  isActive?: boolean;
  settings?: ChurchSettings;
}

export interface ChurchFilter {
  name?: string;
  legalName?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  denomination?: string;
  isHeadquarters?: boolean;
  isActive?: boolean;
  parentChurchId?: string;
  foundedFrom?: string;
  foundedTo?: string;
  createdFrom?: string;
  createdTo?: string;
  createdBy?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface ChurchListResponse {
  items: Church[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ChurchSummary {
  totalChurches: number;
  activeChurches: number;
  inactiveChurches: number;
  headquarters: number;
  totalSites: number;
  activeSites: number;
  churchesByCountry: Record<string, number>;
  churchesByDenomination: Record<string, number>;
  recentChurches: Church[];
  largestChurches: Church[];
  averageSitesPerChurch: number;
}

/**
 * Classe utilitaire pour Church
 */
export class ChurchUtils {
  /**
   * Formate une date
   */
  static getFormattedDate(date?: string): string {
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
  static getFormattedDateOnly(date?: string): string {
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
      ? { label: 'Actif', color: 'success' }
      : { label: 'Inactif', color: 'danger' };
  }

  /**
   * Obtient le badge siège/filiale
   */
  static getHeadquartersBadge(isHeadquarters: boolean): { label: string; color: string } {
    return isHeadquarters
      ? { label: 'Siège', color: 'primary' }
      : { label: 'Filiale', color: 'secondary' };
  }

  /**
   * Obtient les initiales du nom
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
   * Filtre les églises par recherche
   */
  static searchChurches(churches: Church[], searchTerm: string): Church[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return churches;

    return churches.filter(church =>
      church.name.toLowerCase().includes(term) ||
      (church.legalName && church.legalName.toLowerCase().includes(term)) ||
      (church.denomination && church.denomination.toLowerCase().includes(term)) ||
      (church.address?.city && church.address.city.toLowerCase().includes(term)) ||
      (church.address?.country && church.address.country.toLowerCase().includes(term))
    );
  }

  /**
   * Obtient l'adresse complète d'une église
   */
  static getFullAddress(church: Church): string {
    return AddressUtils.getFullAddress(church.address);
  }

  /**
   * Obtient l'adresse courte d'une église
   */
  static getShortAddress(church: Church): string {
    return AddressUtils.getShortAddress(church.address);
  }

  /**
   * Obtient le label du nombre de sites
   */
  static getSiteCountLabel(church: Church): string {
    const count = church.siteCount || church.sites?.length || 0;
    if (count === 0) return 'Aucun site';
    if (count === 1) return '1 site';
    return `${count} sites`;
  }

  /**
   * Crée une église vide
   */
  static createEmpty(): Church {
    return {
      id: '',
      name: '',
      legalName: '',
      email: '',
      phone: '',
      address: AddressUtils.createEmpty(),
      website: '',
      logoUrl: '',
      taxId: '',
      registrationNumber: '',
      foundedDate: '',
      denomination: '',
      missionStatement: '',
      visionStatement: '',
      isHeadquarters: false,
      parentChurchId: '',
      parentChurchName: '',
      sites: [],
      isActive: true,
      settings: {
        defaultLanguage: 'fr',
        timezone: 'Africa/Abidjan',
        currency: 'FCFA',
        fiscalYearStart: 1,
        serviceTimes: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: undefined,
      createdBy: '',
      siteCount: 0
    };
  }

  /**
   * Trie les églises par nombre de sites
   */
  static sortBySiteCount(churches: Church[]): Church[] {
    return [...churches].sort((a, b) =>
      (b.siteCount || b.sites?.length || 0) - (a.siteCount || a.sites?.length || 0)
    );
  }

  /**
   * Groupe les églises par pays
   */
  static groupByCountry(churches: Church[]): Record<string, Church[]> {
    const groups: Record<string, Church[]> = {};
    churches.forEach(church => {
      const country = church.address?.country || 'Non spécifié';
      if (!groups[country]) groups[country] = [];
      groups[country].push(church);
    });
    return groups;
  }

  /**
   * Groupe les églises par dénomination
   */
  static groupByDenomination(churches: Church[]): Record<string, Church[]> {
    const groups: Record<string, Church[]> = {};
    churches.forEach(church => {
      const denomination = church.denomination || 'Non spécifiée';
      if (!groups[denomination]) groups[denomination] = [];
      groups[denomination].push(church);
    });
    return groups;
  }
}

// Valeurs par défaut
export const DEFAULT_CHURCH_FILTER: ChurchFilter = {
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
};
