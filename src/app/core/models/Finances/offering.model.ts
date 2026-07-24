// src/app/core/models/finances/offering.model.ts

import { PaymentMethod, PaymentMethodLabels } from "./expense.model";

// ============================================================
// 1. ENUMS EXISTANTS
// ============================================================

export enum OfferingType {
  Tithe = 'Tithe',
  SundayOffering = 'SundayOffering',
  SpecialOffering = 'SpecialOffering',
  BuildingFund = 'BuildingFund',
  Mission = 'Mission',
  Seed = 'Seed',
  Thanksgiving = 'Thanksgiving',
  Other = 'Other'
}

export enum OfferingStatus {
  Pending = 'Pending',
  Verified = 'Verified',
  Validated = 'Validated',
  Cancelled = 'Cancelled'
}

// ============================================================
// 2. NOUVEL ENUM : CATÉGORIES D'OFFRANDE (choix multiple)
// ============================================================

export enum OfferingCategory {
  FirstOffering = 'FirstOffering',   // 1ère offrande
  SecondOffering = 'SecondOffering', // 2ème offrande
  Tithe = 'Tithe',                   // Dîmes
  Vow = 'Vow',                       // Vœux
  Sacrifice = 'Sacrifice',           // Sacrifice
  Other = 'Other'                    // Autre
}

// ============================================================
// 3. INTERFACE PRINCIPALE
// ============================================================

export interface Offering {
  id: string;
  // ✅ Conservé pour compatibilité (type principal)
  type: OfferingType;
  typeLabel: string;
  typeIcon: string;
  // ✅ Nouveaux champs pour le choix multiple
  categories: OfferingCategory[];
  categoriesLabel: string;           // Liste des catégories en texte (ex: "1ère offrande, Dîmes")
  validationPhotoUrl?: string;       // URL de la photo justificative
  amount: number;
  currency: string;
  date: string;
  memberId?: string;
  memberName?: string;
  churchId: string;
  churchName?: string;
  siteId?: string;
  siteName?: string;
  serviceId?: string;
  serviceTitle?: string;
  validatedBy: string[];
  validatedByNames: string[];
  status: OfferingStatus;
  statusLabel: string;
  statusColor: string;
  receiptNumber?: string;
  receiptGenerated: boolean;
  paymentMethod: PaymentMethod;
  paymentMethodLabel: string;
  reference?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  formattedDate: string;
  formattedAmount: string;
  formattedCreatedAt: string;
}

// ============================================================
// 4. DTOs POUR LES REQUÊTES
// ============================================================

export interface OfferingCreate {
  type: OfferingType;
  amount: number;
  currency?: string;
  date: string;
  memberId?: string;
  churchId: string;
  siteId?: string;
  serviceId?: string;
  status?: OfferingStatus;
  paymentMethod?: PaymentMethod;
  reference?: string;
  notes?: string;
  // ✅ Nouveaux champs
  categories?: OfferingCategory[];
  validationPhotoUrl?: string;
}

export interface OfferingUpdate {
  type?: OfferingType;
  amount?: number;
  currency?: string;
  date?: string;
  memberId?: string;
  siteId?: string;
  serviceId?: string;
  status?: OfferingStatus;
  paymentMethod?: PaymentMethod;
  reference?: string;
  notes?: string;
  // ✅ Nouveaux champs
  categories?: OfferingCategory[];
  validationPhotoUrl?: string;
}

export interface OfferingFilter {
  type?: OfferingType;
  types?: OfferingType[];
  status?: OfferingStatus;
  statuses?: OfferingStatus[];
  memberId?: string;
  churchId?: string;
  siteId?: string;
  serviceId?: string;
  paymentMethod?: PaymentMethod;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  receiptGenerated?: boolean;
  receiptNumber?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface OfferingListResponse {
  items: Offering[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface OfferingValidate {
  offeringId: string;
  validated: boolean;
  comment?: string;
  receiptNumber?: string;
  generateReceipt?: boolean;
}

// ============================================================
// 5. LABELS ET COULEURS (mise à jour)
// ============================================================

export const OfferingTypeLabels: Record<OfferingType, string> = {
  [OfferingType.Tithe]: 'Dîme',
  [OfferingType.SundayOffering]: 'Offrande dominicale',
  [OfferingType.SpecialOffering]: 'Offrande spéciale',
  [OfferingType.BuildingFund]: 'Construction',
  [OfferingType.Mission]: 'Mission',
  [OfferingType.Seed]: 'Offrande de semence',
  [OfferingType.Thanksgiving]: 'Action de grâce',
  [OfferingType.Other]: 'Autre'
};

export const OfferingTypeIcons: Record<OfferingType, string> = {
  [OfferingType.Tithe]: 'fa-hand-holding-heart',
  [OfferingType.SundayOffering]: 'fa-church',
  [OfferingType.SpecialOffering]: 'fa-star',
  [OfferingType.BuildingFund]: 'fa-building',
  [OfferingType.Mission]: 'fa-globe',
  [OfferingType.Seed]: 'fa-seedling',
  [OfferingType.Thanksgiving]: 'fa-hands-praying',
  [OfferingType.Other]: 'fa-coins'
};

export const OfferingTypeColors: Record<OfferingType, string> = {
  [OfferingType.Tithe]: 'primary',
  [OfferingType.SundayOffering]: 'success',
  [OfferingType.SpecialOffering]: 'warning',
  [OfferingType.BuildingFund]: 'info',
  [OfferingType.Mission]: 'purple',
  [OfferingType.Seed]: 'teal',
  [OfferingType.Thanksgiving]: 'orange',
  [OfferingType.Other]: 'secondary'
};

// ✅ Labels pour les catégories (choix multiple)
export const OfferingCategoryLabels: Record<OfferingCategory, string> = {
  [OfferingCategory.FirstOffering]: '1ère offrande',
  [OfferingCategory.SecondOffering]: '2ème offrande',
  [OfferingCategory.Tithe]: 'Dîmes',
  [OfferingCategory.Vow]: 'Vœux',
  [OfferingCategory.Sacrifice]: 'Sacrifice',
  [OfferingCategory.Other]: 'Autre'
};

export const OfferingCategoryColors: Record<OfferingCategory, string> = {
  [OfferingCategory.FirstOffering]: 'primary',
  [OfferingCategory.SecondOffering]: 'success',
  [OfferingCategory.Tithe]: 'warning',
  [OfferingCategory.Vow]: 'info',
  [OfferingCategory.Sacrifice]: 'danger',
  [OfferingCategory.Other]: 'secondary'
};

export const OfferingStatusLabels: Record<OfferingStatus, string> = {
  [OfferingStatus.Pending]: 'En attente',
  [OfferingStatus.Verified]: 'Vérifié',
  [OfferingStatus.Validated]: 'Validé',
  [OfferingStatus.Cancelled]: 'Annulé'
};

export const OfferingStatusColors: Record<OfferingStatus, string> = {
  [OfferingStatus.Pending]: 'warning',
  [OfferingStatus.Verified]: 'info',
  [OfferingStatus.Validated]: 'success',
  [OfferingStatus.Cancelled]: 'danger'
};

// ============================================================
// 6. CLASSE UTILITAIRE (mise à jour)
// ============================================================

export class OfferingUtils {
  static getTypeLabel(type: OfferingType): string {
    return OfferingTypeLabels[type] || type;
  }

  static getTypeIcon(type: OfferingType): string {
    return OfferingTypeIcons[type] || 'fa-coins';
  }

  static getTypeColor(type: OfferingType): string {
    return OfferingTypeColors[type] || 'secondary';
  }

  // ✅ Méthodes pour les catégories
  static getCategoryLabel(category: OfferingCategory): string {
    return OfferingCategoryLabels[category] || category;
  }

  static getCategoryColor(category: OfferingCategory): string {
    return OfferingCategoryColors[category] || 'secondary';
  }

  static getCategoriesLabel(categories: OfferingCategory[]): string {
    if (!categories || categories.length === 0) return '—';
    return categories.map(c => this.getCategoryLabel(c)).join(', ');
  }

  static getStatusLabel(status: OfferingStatus): string {
    return OfferingStatusLabels[status] || status;
  }

  static getStatusColor(status: OfferingStatus): string {
    return OfferingStatusColors[status] || 'secondary';
  }

  static getPaymentMethodLabel(method: PaymentMethod): string {
    return PaymentMethodLabels[method] || method;
  }

  static getFormattedDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  static getFormattedDateTime(date: string): string {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static getFormattedCurrency(amount: number, currency: string): string {
    return `${amount.toLocaleString()} ${currency}`;
  }

  static searchOfferings(offerings: Offering[], searchTerm: string): Offering[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return offerings;

    return offerings.filter(offering =>
      (offering.memberName && offering.memberName.toLowerCase().includes(term)) ||
      (offering.reference && offering.reference.toLowerCase().includes(term)) ||
      (offering.receiptNumber && offering.receiptNumber.toLowerCase().includes(term))
    );
  }

  static filterByType(offerings: Offering[], type: OfferingType): Offering[] {
    if (!type) return offerings;
    return offerings.filter(offering => offering.type === type);
  }

  static filterByStatus(offerings: Offering[], status: OfferingStatus): Offering[] {
    if (!status) return offerings;
    return offerings.filter(offering => offering.status === status);
  }

  static filterByMember(offerings: Offering[], memberId: string): Offering[] {
    if (!memberId) return offerings;
    return offerings.filter(offering => offering.memberId === memberId);
  }

  static filterByCategory(offerings: Offering[], category: OfferingCategory): Offering[] {
    if (!category) return offerings;
    return offerings.filter(offering => offering.categories?.includes(category));
  }

  static sortByAmount(offerings: Offering[], ascending: boolean = true): Offering[] {
    return [...offerings].sort((a, b) =>
      ascending ? a.amount - b.amount : b.amount - a.amount
    );
  }

  static sortByDate(offerings: Offering[], ascending: boolean = false): Offering[] {
    return [...offerings].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return ascending ? dateA - dateB : dateB - dateA;
    });
  }

  static getTotalByType(offerings: Offering[], type: OfferingType): number {
    return offerings
      .filter(o => o.type === type)
      .reduce((sum, o) => sum + o.amount, 0);
  }

  static getTotalByCategory(offerings: Offering[], category: OfferingCategory): number {
    return offerings
      .filter(o => o.categories?.includes(category))
      .reduce((sum, o) => sum + o.amount, 0);
  }

  static getTotalByMember(offerings: Offering[], memberId: string): number {
    return offerings
      .filter(o => o.memberId === memberId)
      .reduce((sum, o) => sum + o.amount, 0);
  }

  static getPendingOfferings(offerings: Offering[]): Offering[] {
    return offerings.filter(o => o.status === OfferingStatus.Pending);
  }

  static getValidatedOfferings(offerings: Offering[]): Offering[] {
    return offerings.filter(o => o.status === OfferingStatus.Validated);
  }

  static getOfferingStats(offerings: Offering[]): {
    total: number;
    totalAmount: number;
    byType: Record<OfferingType, { count: number; amount: number }>;
    byCategory: Record<OfferingCategory, { count: number; amount: number }>;
    byStatus: Record<OfferingStatus, { count: number; amount: number }>;
    averageAmount: number;
    minAmount: number;
    maxAmount: number;
  } {
    const byType: Record<OfferingType, { count: number; amount: number }> = {} as any;
    const byCategory: Record<OfferingCategory, { count: number; amount: number }> = {} as any;
    const byStatus: Record<OfferingStatus, { count: number; amount: number }> = {} as any;
    let totalAmount = 0;
    let minAmount = Infinity;
    let maxAmount = 0;

    Object.values(OfferingType).forEach(t => byType[t] = { count: 0, amount: 0 });
    Object.values(OfferingCategory).forEach(c => byCategory[c] = { count: 0, amount: 0 });
    Object.values(OfferingStatus).forEach(s => byStatus[s] = { count: 0, amount: 0 });

    offerings.forEach(o => {
      totalAmount += o.amount;
      if (o.amount < minAmount) minAmount = o.amount;
      if (o.amount > maxAmount) maxAmount = o.amount;
      byType[o.type].count++;
      byType[o.type].amount += o.amount;
      if (o.categories) {
        o.categories.forEach(cat => {
          byCategory[cat].count++;
          byCategory[cat].amount += o.amount;
        });
      }
      byStatus[o.status].count++;
      byStatus[o.status].amount += o.amount;
    });

    return {
      total: offerings.length,
      totalAmount,
      byType,
      byCategory,
      byStatus,
      averageAmount: offerings.length > 0 ? totalAmount / offerings.length : 0,
      minAmount: offerings.length > 0 ? minAmount : 0,
      maxAmount: offerings.length > 0 ? maxAmount : 0
    };
  }
}

export const DEFAULT_OFFERING_FILTER: OfferingFilter = {
  page: 1,
  pageSize: 20,
  sortBy: 'date',
  sortOrder: 'desc'
};

// ============================================================
// 7. STATISTIQUES (DÉJÀ PRÉSENTES, COMPLÉTÉES)
// ============================================================

export interface OfferingStatisticsDto {
  totalAmount: number;
  totalCount: number;
  amountByType: Record<OfferingType, number>;
  countByType: Record<OfferingType, number>;
  countByStatus: Record<OfferingStatus, number>;
  countByPaymentMethod: Record<PaymentMethod, number>;
  recentOfferings: OfferingListResponse[];
  thisMonthTotal: number;
  thisWeekTotal: number;
  averageOffering: number;
}

export interface OfferingSummaryDto {
  totalGiven: number;
  totalOfferings: number;
  titheTotal: number;
  offeringTotal: number;
  byType: Record<string, number>;
  byMonth: Record<string, number>;
  recentOfferings: Offering[];
  averageMonthly: number;
  lastYearTotal: number;
}

// Valeurs par défaut
export const DEFAULT_OFFERING_STATISTICS: OfferingStatisticsDto = {
  totalAmount: 0,
  totalCount: 0,
  amountByType: {} as Record<OfferingType, number>,
  countByType: {} as Record<OfferingType, number>,
  countByStatus: {} as Record<OfferingStatus, number>,
  countByPaymentMethod: {} as Record<PaymentMethod, number>,
  recentOfferings: [],
  thisMonthTotal: 0,
  thisWeekTotal: 0,
  averageOffering: 0
};

export const DEFAULT_OFFERING_SUMMARY: OfferingSummaryDto = {
  totalGiven: 0,
  totalOfferings: 0,
  titheTotal: 0,
  offeringTotal: 0,
  byType: {},
  byMonth: {},
  recentOfferings: [],
  averageMonthly: 0,
  lastYearTotal: 0
};

// ============================================================
// 8. UTILITAIRES POUR STATISTIQUES
// ============================================================

export class OfferingStatisticsUtils {
  static getPercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  static formatAmount(amount: number, currency: string = 'FCFA'): string {
    return `${amount.toLocaleString('fr-FR')} ${currency}`;
  }

  static getTypeLabel(type: OfferingType): string {
    return OfferingTypeLabels[type] || type;
  }

  static getTypeIcon(type: OfferingType): string {
    return OfferingTypeIcons[type] || 'fa-coins';
  }

  static getCategoryLabel(category: OfferingCategory): string {
    return OfferingCategoryLabels[category] || category;
  }

  static getStatusColor(status: OfferingStatus): string {
    return OfferingStatusColors[status] || 'secondary';
  }

  static getStatusLabel(status: OfferingStatus): string {
    return OfferingStatusLabels[status] || status;
  }

  static getPaymentMethodLabel(method: PaymentMethod): string {
    const labels: Record<PaymentMethod, string> = {
      [PaymentMethod.Cash]: 'Espèces',
      [PaymentMethod.BankTransfer]: 'Virement bancaire',
      [PaymentMethod.MobileMoney]: 'Mobile Money',
      [PaymentMethod.Check]: 'Chèque',
      [PaymentMethod.Card]: 'Carte',
      [PaymentMethod.InKind]: 'Don en nature'
    };
    return labels[method] || method;
  }

  static filterByType(stats: OfferingStatisticsDto, types: OfferingType[]): OfferingStatisticsDto {
    return {
      ...stats,
      amountByType: Object.fromEntries(
        Object.entries(stats.amountByType).filter(([key]) =>
          types.includes(key as OfferingType)
        )
      ) as Record<OfferingType, number>,
      countByType: Object.fromEntries(
        Object.entries(stats.countByType).filter(([key]) =>
          types.includes(key as OfferingType)
        )
      ) as Record<OfferingType, number>
    };
  }

  static getTopTypes(stats: OfferingStatisticsDto, limit: number = 5): { type: OfferingType; amount: number }[] {
    return Object.entries(stats.amountByType)
      .map(([key, value]) => ({
        type: key as OfferingType,
        amount: value
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  }

  static getMonthlyGrowthRate(summary: OfferingSummaryDto): number {
    const months = Object.keys(summary.byMonth).sort();
    if (months.length < 2) return 0;

    const lastMonth = months[months.length - 1];
    const previousMonth = months[months.length - 2];
    const current = summary.byMonth[lastMonth] || 0;
    const previous = summary.byMonth[previousMonth] || 0;

    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  static getCategoryBreakdown(stats: OfferingStatisticsDto): { label: string; value: number; percentage: number }[] {
    const total = stats.totalAmount;
    return Object.entries(stats.amountByType).map(([key, value]) => ({
      label: this.getTypeLabel(key as OfferingType),
      value,
      percentage: this.getPercentage(value, total)
    }));
  }
}
