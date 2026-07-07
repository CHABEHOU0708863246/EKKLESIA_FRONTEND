import { Address } from "cluster";
import { Contract } from "./contract.model";

export enum PropertyType {
  Building = 'Building',
  Land = 'Land',
  Vehicle = 'Vehicle',
  Equipment = 'Equipment',
  Furniture = 'Furniture',
  Other = 'Other'
}

export enum PropertyStatus {
  Owned = 'Owned',
  Rented = 'Rented',
  Leased = 'Leased',
  UnderMaintenance = 'UnderMaintenance',
  Available = 'Available',
  Unavailable = 'Unavailable'
}

export interface Insurance {
  provider: string;
  policyNumber: string;
  startDate: string;
  endDate: string;
  amount: number;
  currency: string;
  coverage?: string;
  isActive: boolean;
  formattedStartDate: string;
  formattedEndDate: string;
  formattedAmount: string;
  isExpired: boolean;
  daysUntilExpiry: number;
}

export interface Property {
  id: string;
  name: string;
  type: PropertyType;
  typeLabel: string;
  typeIcon: string;
  address: Address;
  capacity?: number;
  area?: number;
  status: PropertyStatus;
  statusLabel: string;
  statusColor: string;
  acquisitionDate?: string;
  acquisitionValue?: number;
  currentValue?: number;
  currency: string;
  churchId: string;
  churchName?: string;
  siteId?: string;
  siteName?: string;
  insurance?: Insurance;
  contractIds: string[];
  contracts: Contract[];
  documentUrls: string[];
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  contractCount: number;
  formattedAcquisitionDate: string;
  formattedAcquisitionValue: string;
  formattedCurrentValue: string;
  formattedArea: string;
  fullAddress: string;
}

export interface PropertyCreate {
  name: string;
  type: PropertyType;
  address: Address;
  capacity?: number;
  area?: number;
  status?: PropertyStatus;
  acquisitionDate?: string;
  acquisitionValue?: number;
  currentValue?: number;
  currency?: string;
  churchId: string;
  siteId?: string;
  insurance?: Insurance;
  documentUrls?: string[];
  notes?: string;
  isActive?: boolean;
}

export interface PropertyUpdate {
  name?: string;
  type?: PropertyType;
  address?: Address;
  capacity?: number;
  area?: number;
  status?: PropertyStatus;
  acquisitionDate?: string;
  acquisitionValue?: number;
  currentValue?: number;
  currency?: string;
  siteId?: string;
  insurance?: Insurance;
  documentUrls?: string[];
  notes?: string;
  isActive?: boolean;
}

export interface PropertyFilter {
  name?: string;
  type?: PropertyType;
  types?: PropertyType[];
  status?: PropertyStatus;
  statuses?: PropertyStatus[];
  churchId?: string;
  siteId?: string;
  city?: string;
  isActive?: boolean;
  minArea?: number;
  maxArea?: number;
  minCapacity?: number;
  maxCapacity?: number;
  minAcquisitionValue?: number;
  maxAcquisitionValue?: number;
  acquisitionDateFrom?: string;
  acquisitionDateTo?: string;
  createdFrom?: string;
  createdTo?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface PropertyListResponse {
  items: Property[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// Labels
export const PropertyTypeLabels: Record<PropertyType, string> = {
  [PropertyType.Building]: 'Bâtiment',
  [PropertyType.Land]: 'Terrain',
  [PropertyType.Vehicle]: 'Véhicule',
  [PropertyType.Equipment]: 'Équipement',
  [PropertyType.Furniture]: 'Mobilier',
  [PropertyType.Other]: 'Autre'
};

export const PropertyTypeIcons: Record<PropertyType, string> = {
  [PropertyType.Building]: 'fa-building',
  [PropertyType.Land]: 'fa-tree',
  [PropertyType.Vehicle]: 'fa-car',
  [PropertyType.Equipment]: 'fa-microchip',
  [PropertyType.Furniture]: 'fa-chair',
  [PropertyType.Other]: 'fa-cube'
};

export const PropertyTypeColors: Record<PropertyType, string> = {
  [PropertyType.Building]: 'primary',
  [PropertyType.Land]: 'success',
  [PropertyType.Vehicle]: 'warning',
  [PropertyType.Equipment]: 'info',
  [PropertyType.Furniture]: 'secondary',
  [PropertyType.Other]: 'dark'
};

export const PropertyStatusLabels: Record<PropertyStatus, string> = {
  [PropertyStatus.Owned]: 'Propriété',
  [PropertyStatus.Rented]: 'Loué',
  [PropertyStatus.Leased]: 'En location',
  [PropertyStatus.UnderMaintenance]: 'En maintenance',
  [PropertyStatus.Available]: 'Disponible',
  [PropertyStatus.Unavailable]: 'Indisponible'
};

export const PropertyStatusColors: Record<PropertyStatus, string> = {
  [PropertyStatus.Owned]: 'primary',
  [PropertyStatus.Rented]: 'warning',
  [PropertyStatus.Leased]: 'info',
  [PropertyStatus.UnderMaintenance]: 'danger',
  [PropertyStatus.Available]: 'success',
  [PropertyStatus.Unavailable]: 'secondary'
};

// Classe utilitaire
export class PropertyUtils {
  static getTypeLabel(type: PropertyType): string {
    return PropertyTypeLabels[type] || type;
  }

  static getTypeIcon(type: PropertyType): string {
    return PropertyTypeIcons[type] || 'fa-cube';
  }

  static getTypeColor(type: PropertyType): string {
    return PropertyTypeColors[type] || 'secondary';
  }

  static getStatusLabel(status: PropertyStatus): string {
    return PropertyStatusLabels[status] || status;
  }

  static getStatusColor(status: PropertyStatus): string {
    return PropertyStatusColors[status] || 'secondary';
  }

  static getFormattedDate(date?: string): string {
    if (!date) return 'Non renseigné';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  static getFormattedCurrency(amount?: number, currency?: string): string {
    if (!amount) return 'Non renseigné';
    return `${amount.toLocaleString()} ${currency || 'FCFA'}`;
  }

  static getFormattedArea(area?: number): string {
    if (!area) return 'Non renseigné';
    return `${area} m²`;
  }

  static getFullAddress(property: Property): string {
    return property.fullAddress || 'Adresse non renseignée';
  }

  static searchProperties(properties: Property[], searchTerm: string): Property[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return properties;

    return properties.filter(property =>
      property.name.toLowerCase().includes(term) ||
      property.fullAddress.toLowerCase().includes(term) ||
      (property.notes && property.notes.toLowerCase().includes(term))
    );
  }

  static filterByType(properties: Property[], type: PropertyType): Property[] {
    if (!type) return properties;
    return properties.filter(property => property.type === type);
  }

  static filterByStatus(properties: Property[], status: PropertyStatus): Property[] {
    if (!status) return properties;
    return properties.filter(property => property.status === status);
  }

  static sortByValue(properties: Property[], key: 'acquisitionValue' | 'currentValue', ascending: boolean = false): Property[] {
    return [...properties].sort((a, b) => {
      const valA = a[key] || 0;
      const valB = b[key] || 0;
      return ascending ? valA - valB : valB - valA;
    });
  }

  static getPropertyStats(properties: Property[]): {
    total: number;
    byType: Record<PropertyType, number>;
    byStatus: Record<PropertyStatus, number>;
    active: number;
    inactive: number;
    totalAcquisitionValue: number;
    totalCurrentValue: number;
    totalArea: number;
  } {
    const byType: Record<PropertyType, number> = {} as any;
    const byStatus: Record<PropertyStatus, number> = {} as any;
    let totalAcquisitionValue = 0;
    let totalCurrentValue = 0;
    let totalArea = 0;

    Object.values(PropertyType).forEach(t => byType[t] = 0);
    Object.values(PropertyStatus).forEach(s => byStatus[s] = 0);

    properties.forEach(p => {
      byType[p.type] = (byType[p.type] || 0) + 1;
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      totalAcquisitionValue += p.acquisitionValue || 0;
      totalCurrentValue += p.currentValue || 0;
      totalArea += p.area || 0;
    });

    return {
      total: properties.length,
      byType,
      byStatus,
      active: properties.filter(p => p.isActive).length,
      inactive: properties.filter(p => !p.isActive).length,
      totalAcquisitionValue,
      totalCurrentValue,
      totalArea
    };
  }
}

export const DEFAULT_PROPERTY_FILTER: PropertyFilter = {
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
};
