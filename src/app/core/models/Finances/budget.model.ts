// src/app/core/models/finances/budget.model.ts

export enum BudgetStatus {
  Draft = 'Draft',
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Closed = 'Closed'
}

export interface BudgetCategory {
  name: string;
  code: string;
  allocated: number;
  spent: number;
  remaining: number;
  notes?: string;
  utilizationRate: number;
}

export interface Budget {
  id: string;
  name: string;
  year: number;
  churchId: string;
  churchName?: string;
  siteId?: string;
  siteName?: string;
  categories: BudgetCategory[];
  status: BudgetStatus;
  statusLabel: string;
  statusColor: string;
  approvedBy: string[];
  approvedByNames: string[];
  approvedAt?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  utilizationRate: number;
  formattedCreatedAt: string;
  formattedApprovedAt?: string;
}

export interface BudgetCreate {
  name: string;
  year: number;
  churchId: string;
  siteId?: string;
  categories: BudgetCategory[];
  status?: BudgetStatus;
}

export interface BudgetUpdate {
  name?: string;
  year?: number;
  siteId?: string;
  categories?: BudgetCategory[];
  status?: BudgetStatus;
}

export interface BudgetFilter {
  name?: string;
  year?: number;
  status?: BudgetStatus;
  churchId?: string;
  siteId?: string;
  createdBy?: string;
  createdFrom?: string;
  createdTo?: string;
  approvedFrom?: string;
  approvedTo?: string;
  minTotalBudget?: number;
  maxTotalBudget?: number;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface BudgetListResponse {
  items: Budget[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// Labels
export const BudgetStatusLabels: Record<BudgetStatus, string> = {
  [BudgetStatus.Draft]: 'Brouillon',
  [BudgetStatus.Pending]: 'En attente',
  [BudgetStatus.Approved]: 'Approuvé',
  [BudgetStatus.Rejected]: 'Rejeté',
  [BudgetStatus.Closed]: 'Clôturé'
};

export const BudgetStatusColors: Record<BudgetStatus, string> = {
  [BudgetStatus.Draft]: 'secondary',
  [BudgetStatus.Pending]: 'warning',
  [BudgetStatus.Approved]: 'success',
  [BudgetStatus.Rejected]: 'danger',
  [BudgetStatus.Closed]: 'info'
};

// Classe utilitaire
export class BudgetUtils {
  static getStatusLabel(status: BudgetStatus): string {
    return BudgetStatusLabels[status] || status;
  }

  static getStatusColor(status: BudgetStatus): string {
    return BudgetStatusColors[status] || 'secondary';
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

  static getUtilizationRateColor(rate: number): string {
    if (rate >= 90) return 'danger';
    if (rate >= 70) return 'warning';
    return 'success';
  }

  static getUtilizationRateLabel(rate: number): string {
    if (rate >= 90) return 'Critique';
    if (rate >= 70) return 'Élevé';
    if (rate >= 40) return 'Modéré';
    return 'Faible';
  }

  static calculateTotalBudget(categories: BudgetCategory[]): number {
    return categories.reduce((sum, cat) => sum + cat.allocated, 0);
  }

  static calculateTotalSpent(categories: BudgetCategory[]): number {
    return categories.reduce((sum, cat) => sum + cat.spent, 0);
  }

  static searchBudgets(budgets: Budget[], searchTerm: string): Budget[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return budgets;

    return budgets.filter(budget =>
      budget.name.toLowerCase().includes(term) ||
      budget.year.toString().includes(term)
    );
  }

  static filterByYear(budgets: Budget[], year: number): Budget[] {
    if (!year) return budgets;
    return budgets.filter(budget => budget.year === year);
  }

  static sortByYear(budgets: Budget[], ascending: boolean = false): Budget[] {
    return [...budgets].sort((a, b) =>
      ascending ? a.year - b.year : b.year - a.year
    );
  }

  static getActiveBudgets(budgets: Budget[]): Budget[] {
    return budgets.filter(b =>
      b.status === BudgetStatus.Approved ||
      b.status === BudgetStatus.Pending
    );
  }

  static getClosedBudgets(budgets: Budget[]): Budget[] {
    return budgets.filter(b => b.status === BudgetStatus.Closed);
  }
}

export const DEFAULT_BUDGET_FILTER: BudgetFilter = {
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
};
