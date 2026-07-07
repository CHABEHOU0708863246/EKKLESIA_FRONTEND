// src/app/core/models/propertys/contract.model.ts

export enum ContractType {
  Lease = 'Lease',
  Rental = 'Rental',
  Purchase = 'Purchase',
  Service = 'Service',
  Maintenance = 'Maintenance',
  Insurance = 'Insurance',
  Partnership = 'Partnership',
  Other = 'Other'
}

export enum ContractStatus {
  Draft = 'Draft',
  Active = 'Active',
  Expired = 'Expired',
  Terminated = 'Terminated',
  Renewed = 'Renewed',
  Pending = 'Pending'
}

export interface Contract {
  id: string;
  reference: string;
  title: string;
  type: ContractType;
  typeLabel: string;
  typeIcon: string;
  propertyId: string;
  propertyName: string;
  partyName: string;
  partyType: string;
  startDate: string;
  endDate: string;
  amount: number;
  currency: string;
  paymentFrequency: string;
  paymentFrequencyLabel: string;
  deposit?: number;
  penaltyRate?: number;
  status: ContractStatus;
  statusLabel: string;
  statusColor: string;
  terms?: string;
  documentUrls: string[];
  churchId: string;
  churchName?: string;
  siteId?: string;
  siteName?: string;
  renewalDate?: string;
  autoRenew: boolean;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  formattedStartDate: string;
  formattedEndDate: string;
  formattedAmount: string;
  formattedDeposit: string;
  formattedRenewalDate: string;
  daysRemaining: number;
  isExpiringSoon: boolean;
  isExpired: boolean;
  duration: string;
}

export interface ContractCreate {
  reference: string;
  title: string;
  type: ContractType;
  propertyId: string;
  partyName: string;
  partyType: string;
  startDate: string;
  endDate: string;
  amount: number;
  currency?: string;
  paymentFrequency?: string;
  deposit?: number;
  penaltyRate?: number;
  status?: ContractStatus;
  terms?: string;
  documentUrls?: string[];
  churchId: string;
  siteId?: string;
  renewalDate?: string;
  autoRenew?: boolean;
  notes?: string;
}

export interface ContractUpdate {
  reference?: string;
  title?: string;
  type?: ContractType;
  propertyId?: string;
  partyName?: string;
  partyType?: string;
  startDate?: string;
  endDate?: string;
  amount?: number;
  currency?: string;
  paymentFrequency?: string;
  deposit?: number;
  penaltyRate?: number;
  status?: ContractStatus;
  terms?: string;
  documentUrls?: string[];
  siteId?: string;
  renewalDate?: string;
  autoRenew?: boolean;
  notes?: string;
}

export interface ContractFilter {
  reference?: string;
  title?: string;
  type?: ContractType;
  types?: ContractType[];
  status?: ContractStatus;
  statuses?: ContractStatus[];
  propertyId?: string;
  partyName?: string;
  partyType?: string;
  churchId?: string;
  siteId?: string;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  isExpiringSoon?: boolean;
  isExpired?: boolean;
  autoRenew?: boolean;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface ContractListResponse {
  items: Contract[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// Labels
export const ContractTypeLabels: Record<ContractType, string> = {
  [ContractType.Lease]: 'Bail',
  [ContractType.Rental]: 'Location',
  [ContractType.Purchase]: 'Achat',
  [ContractType.Service]: 'Service',
  [ContractType.Maintenance]: 'Maintenance',
  [ContractType.Insurance]: 'Assurance',
  [ContractType.Partnership]: 'Partenariat',
  [ContractType.Other]: 'Autre'
};

export const ContractTypeIcons: Record<ContractType, string> = {
  [ContractType.Lease]: 'fa-file-signature',
  [ContractType.Rental]: 'fa-home',
  [ContractType.Purchase]: 'fa-shopping-cart',
  [ContractType.Service]: 'fa-tools',
  [ContractType.Maintenance]: 'fa-wrench',
  [ContractType.Insurance]: 'fa-shield-alt',
  [ContractType.Partnership]: 'fa-handshake',
  [ContractType.Other]: 'fa-file'
};

export const ContractTypeColors: Record<ContractType, string> = {
  [ContractType.Lease]: 'primary',
  [ContractType.Rental]: 'info',
  [ContractType.Purchase]: 'success',
  [ContractType.Service]: 'warning',
  [ContractType.Maintenance]: 'orange',
  [ContractType.Insurance]: 'teal',
  [ContractType.Partnership]: 'purple',
  [ContractType.Other]: 'secondary'
};

export const ContractStatusLabels: Record<ContractStatus, string> = {
  [ContractStatus.Draft]: 'Brouillon',
  [ContractStatus.Active]: 'Actif',
  [ContractStatus.Expired]: 'Expiré',
  [ContractStatus.Terminated]: 'Résilié',
  [ContractStatus.Renewed]: 'Renouvelé',
  [ContractStatus.Pending]: 'En attente'
};

export const ContractStatusColors: Record<ContractStatus, string> = {
  [ContractStatus.Draft]: 'secondary',
  [ContractStatus.Active]: 'success',
  [ContractStatus.Expired]: 'danger',
  [ContractStatus.Terminated]: 'danger',
  [ContractStatus.Renewed]: 'info',
  [ContractStatus.Pending]: 'warning'
};

export const PaymentFrequencyLabels: Record<string, string> = {
  'Monthly': 'Mensuel',
  'Quarterly': 'Trimestriel',
  'Annually': 'Annuel'
};

// Classe utilitaire
export class ContractUtils {
  static getTypeLabel(type: ContractType): string {
    return ContractTypeLabels[type] || type;
  }

  static getTypeIcon(type: ContractType): string {
    return ContractTypeIcons[type] || 'fa-file';
  }

  static getTypeColor(type: ContractType): string {
    return ContractTypeColors[type] || 'secondary';
  }

  static getStatusLabel(status: ContractStatus): string {
    return ContractStatusLabels[status] || status;
  }

  static getStatusColor(status: ContractStatus): string {
    return ContractStatusColors[status] || 'secondary';
  }

  static getPaymentFrequencyLabel(frequency: string): string {
    return PaymentFrequencyLabels[frequency] || frequency;
  }

  static getFormattedDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  static getFormattedCurrency(amount: number, currency: string): string {
    return `${amount.toLocaleString()} ${currency}`;
  }

  static getDaysRemaining(endDate: string): number {
    const end = new Date(endDate);
    const now = new Date();
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  static getDuration(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return `${days} jours`;
  }

  static getExpiryStatus(contract: Contract): { label: string; color: string } {
    if (contract.isExpired) {
      return { label: 'Expiré', color: 'danger' };
    }
    if (contract.isExpiringSoon) {
      return { label: 'Expire bientôt', color: 'warning' };
    }
    return { label: 'Valide', color: 'success' };
  }

  static searchContracts(contracts: Contract[], searchTerm: string): Contract[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return contracts;

    return contracts.filter(contract =>
      contract.title.toLowerCase().includes(term) ||
      contract.reference.toLowerCase().includes(term) ||
      contract.partyName.toLowerCase().includes(term) ||
      contract.propertyName.toLowerCase().includes(term)
    );
  }

  static filterByStatus(contracts: Contract[], status: ContractStatus): Contract[] {
    if (!status) return contracts;
    return contracts.filter(contract => contract.status === status);
  }

  static filterByType(contracts: Contract[], type: ContractType): Contract[] {
    if (!type) return contracts;
    return contracts.filter(contract => contract.type === type);
  }

  static filterExpiring(contracts: Contract[]): Contract[] {
    return contracts.filter(c => c.isExpiringSoon && !c.isExpired);
  }

  static filterExpired(contracts: Contract[]): Contract[] {
    return contracts.filter(c => c.isExpired);
  }

  static filterActive(contracts: Contract[]): Contract[] {
    return contracts.filter(c => c.status === ContractStatus.Active);
  }

  static sortByEndDate(contracts: Contract[], ascending: boolean = true): Contract[] {
    return [...contracts].sort((a, b) => {
      const dateA = new Date(a.endDate).getTime();
      const dateB = new Date(b.endDate).getTime();
      return ascending ? dateA - dateB : dateB - dateA;
    });
  }

  static sortByAmount(contracts: Contract[], ascending: boolean = true): Contract[] {
    return [...contracts].sort((a, b) =>
      ascending ? a.amount - b.amount : b.amount - a.amount
    );
  }

  static getContractStats(contracts: Contract[]): {
    total: number;
    byType: Record<ContractType, number>;
    byStatus: Record<ContractStatus, number>;
    active: number;
    expiring: number;
    expired: number;
    totalAmount: number;
    totalDeposit: number;
    averageAmount: number;
  } {
    const byType: Record<ContractType, number> = {} as any;
    const byStatus: Record<ContractStatus, number> = {} as any;
    let totalAmount = 0;
    let totalDeposit = 0;

    Object.values(ContractType).forEach(t => byType[t] = 0);
    Object.values(ContractStatus).forEach(s => byStatus[s] = 0);

    contracts.forEach(c => {
      byType[c.type] = (byType[c.type] || 0) + 1;
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      totalAmount += c.amount;
      totalDeposit += c.deposit || 0;
    });

    return {
      total: contracts.length,
      byType,
      byStatus,
      active: contracts.filter(c => c.status === ContractStatus.Active).length,
      expiring: contracts.filter(c => c.isExpiringSoon).length,
      expired: contracts.filter(c => c.isExpired).length,
      totalAmount,
      totalDeposit,
      averageAmount: contracts.length > 0 ? totalAmount / contracts.length : 0
    };
  }
}

export const DEFAULT_CONTRACT_FILTER: ContractFilter = {
  page: 1,
  pageSize: 20,
  sortBy: 'startDate',
  sortOrder: 'desc'
};
