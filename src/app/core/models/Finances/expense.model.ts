
export enum ExpenseCategory {
  Salaries = 'Salaries',
  Rent = 'Rent',
  Utilities = 'Utilities',
  Maintenance = 'Maintenance',
  Missions = 'Missions',
  Events = 'Events',
  OfficeSupplies = 'OfficeSupplies',
  Transportation = 'Transportation',
  Communication = 'Communication',
  Construction = 'Construction',
  Repairs = 'Repairs',
  Insurance = 'Insurance',
  Taxes = 'Taxes',
  Other = 'Other'
}

export enum ExpenseStatus {
  Draft = 'Draft',
  Pending = 'Pending',
  Approved = 'Approved',
  Paid = 'Paid',
  Rejected = 'Rejected',
  Cancelled = 'Cancelled'
}

export enum PaymentMethod {
  Cash = 'Cash',
  BankTransfer = 'BankTransfer',
  MobileMoney = 'MobileMoney',
  Check = 'Check',
  Card = 'Card',
  InKind = 'InKind'
}

export interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  categoryLabel: string;
  categoryIcon: string;
  date: string;
  churchId: string;
  churchName?: string;
  siteId?: string;
  siteName?: string;
  requestedBy: string;
  requestedByName: string;
  validatedBy: string[];
  validatedByNames: string[];
  status: ExpenseStatus;
  statusLabel: string;
  statusColor: string;
  receiptUrl?: string;
  paymentMethod: PaymentMethod;
  paymentMethodLabel: string;
  reference?: string;
  budgetCode?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  approvedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
  formattedDate: string;
  formattedAmount: string;
  formattedCreatedAt: string;
  formattedApprovedAt?: string;
}

export interface ExpenseCreate {
  title: string;
  description?: string;
  amount: number;
  currency?: string;
  category: ExpenseCategory;
  date: string;
  churchId: string;
  siteId?: string;
  requestedBy: string;
  status?: ExpenseStatus;
  receiptUrl?: string;
  paymentMethod?: PaymentMethod;
  reference?: string;
  budgetCode?: string;
}

export interface ExpenseUpdate {
  title?: string;
  description?: string;
  amount?: number;
  currency?: string;
  category?: ExpenseCategory;
  date?: string;
  siteId?: string;
  status?: ExpenseStatus;
  receiptUrl?: string;
  paymentMethod?: PaymentMethod;
  reference?: string;
  budgetCode?: string;
}

export interface ExpenseFilter {
  title?: string;
  description?: string;
  category?: ExpenseCategory;
  categories?: ExpenseCategory[];
  status?: ExpenseStatus;
  statuses?: ExpenseStatus[];
  churchId?: string;
  siteId?: string;
  requestedBy?: string;
  approvedBy?: string;
  paymentMethod?: PaymentMethod;
  budgetCode?: string;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
  createdFrom?: string;
  createdTo?: string;
  approvedFrom?: string;
  approvedTo?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface ExpenseListResponse {
  items: Expense[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ExpenseApprove {
  expenseId: string;
  approved: boolean;
  comment?: string;
}

// Labels
export const ExpenseCategoryLabels: Record<ExpenseCategory, string> = {
  [ExpenseCategory.Salaries]: 'Salaires',
  [ExpenseCategory.Rent]: 'Loyer',
  [ExpenseCategory.Utilities]: 'Charges',
  [ExpenseCategory.Maintenance]: 'Maintenance',
  [ExpenseCategory.Missions]: 'Missions',
  [ExpenseCategory.Events]: 'Événements',
  [ExpenseCategory.OfficeSupplies]: 'Fournitures',
  [ExpenseCategory.Transportation]: 'Transport',
  [ExpenseCategory.Communication]: 'Communication',
  [ExpenseCategory.Construction]: 'Construction',
  [ExpenseCategory.Repairs]: 'Réparations',
  [ExpenseCategory.Insurance]: 'Assurances',
  [ExpenseCategory.Taxes]: 'Impôts',
  [ExpenseCategory.Other]: 'Autre'
};

export const ExpenseCategoryIcons: Record<ExpenseCategory, string> = {
  [ExpenseCategory.Salaries]: 'fa-user-tie',
  [ExpenseCategory.Rent]: 'fa-building',
  [ExpenseCategory.Utilities]: 'fa-bolt',
  [ExpenseCategory.Maintenance]: 'fa-wrench',
  [ExpenseCategory.Missions]: 'fa-globe',
  [ExpenseCategory.Events]: 'fa-calendar',
  [ExpenseCategory.OfficeSupplies]: 'fa-box',
  [ExpenseCategory.Transportation]: 'fa-truck',
  [ExpenseCategory.Communication]: 'fa-phone',
  [ExpenseCategory.Construction]: 'fa-hard-hat',
  [ExpenseCategory.Repairs]: 'fa-hammer',
  [ExpenseCategory.Insurance]: 'fa-shield-alt',
  [ExpenseCategory.Taxes]: 'fa-file-invoice',
  [ExpenseCategory.Other]: 'fa-ellipsis-h'
};

export const ExpenseStatusLabels: Record<ExpenseStatus, string> = {
  [ExpenseStatus.Draft]: 'Brouillon',
  [ExpenseStatus.Pending]: 'En attente',
  [ExpenseStatus.Approved]: 'Approuvé',
  [ExpenseStatus.Paid]: 'Payé',
  [ExpenseStatus.Rejected]: 'Rejeté',
  [ExpenseStatus.Cancelled]: 'Annulé'
};

export const ExpenseStatusColors: Record<ExpenseStatus, string> = {
  [ExpenseStatus.Draft]: 'secondary',
  [ExpenseStatus.Pending]: 'warning',
  [ExpenseStatus.Approved]: 'info',
  [ExpenseStatus.Paid]: 'success',
  [ExpenseStatus.Rejected]: 'danger',
  [ExpenseStatus.Cancelled]: 'danger'
};

export const PaymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.Cash]: 'Espèces',
  [PaymentMethod.BankTransfer]: 'Virement bancaire',
  [PaymentMethod.MobileMoney]: 'Mobile Money',
  [PaymentMethod.Check]: 'Chèque',
  [PaymentMethod.Card]: 'Carte',
  [PaymentMethod.InKind]: 'Don en nature'
};

// Classe utilitaire
export class ExpenseUtils {
  static getCategoryLabel(category: ExpenseCategory): string {
    return ExpenseCategoryLabels[category] || category;
  }

  static getCategoryIcon(category: ExpenseCategory): string {
    return ExpenseCategoryIcons[category] || 'fa-file';
  }

  static getStatusLabel(status: ExpenseStatus): string {
    return ExpenseStatusLabels[status] || status;
  }

  static getStatusColor(status: ExpenseStatus): string {
    return ExpenseStatusColors[status] || 'secondary';
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

  static searchExpenses(expenses: Expense[], searchTerm: string): Expense[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return expenses;

    return expenses.filter(expense =>
      expense.title.toLowerCase().includes(term) ||
      (expense.description && expense.description.toLowerCase().includes(term)) ||
      (expense.reference && expense.reference.toLowerCase().includes(term)) ||
      (expense.budgetCode && expense.budgetCode.toLowerCase().includes(term))
    );
  }

  static filterByCategory(expenses: Expense[], category: ExpenseCategory): Expense[] {
    if (!category) return expenses;
    return expenses.filter(expense => expense.category === category);
  }

  static filterByStatus(expenses: Expense[], status: ExpenseStatus): Expense[] {
    if (!status) return expenses;
    return expenses.filter(expense => expense.status === status);
  }

  static filterByPaymentMethod(expenses: Expense[], method: PaymentMethod): Expense[] {
    if (!method) return expenses;
    return expenses.filter(expense => expense.paymentMethod === method);
  }

  static sortByAmount(expenses: Expense[], ascending: boolean = true): Expense[] {
    return [...expenses].sort((a, b) =>
      ascending ? a.amount - b.amount : b.amount - a.amount
    );
  }

  static sortByDate(expenses: Expense[], ascending: boolean = false): Expense[] {
    return [...expenses].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return ascending ? dateA - dateB : dateB - dateA;
    });
  }

  static getPendingExpenses(expenses: Expense[]): Expense[] {
    return expenses.filter(e => e.status === ExpenseStatus.Pending);
  }

  static getApprovedExpenses(expenses: Expense[]): Expense[] {
    return expenses.filter(e => e.status === ExpenseStatus.Approved);
  }

  static getPaidExpenses(expenses: Expense[]): Expense[] {
    return expenses.filter(e => e.status === ExpenseStatus.Paid);
  }

  static getTotalByCategory(expenses: Expense[], category: ExpenseCategory): number {
    return expenses
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  static getExpenseStats(expenses: Expense[]): {
    total: number;
    totalAmount: number;
    pending: number;
    pendingAmount: number;
    approved: number;
    approvedAmount: number;
    paid: number;
    paidAmount: number;
    rejected: number;
    rejectedAmount: number;
    averageAmount: number;
  } {
    const pending = expenses.filter(e => e.status === ExpenseStatus.Pending);
    const approved = expenses.filter(e => e.status === ExpenseStatus.Approved);
    const paid = expenses.filter(e => e.status === ExpenseStatus.Paid);
    const rejected = expenses.filter(e => e.status === ExpenseStatus.Rejected);
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      total: expenses.length,
      totalAmount: totalAmount,
      pending: pending.length,
      pendingAmount: pending.reduce((sum, e) => sum + e.amount, 0),
      approved: approved.length,
      approvedAmount: approved.reduce((sum, e) => sum + e.amount, 0),
      paid: paid.length,
      paidAmount: paid.reduce((sum, e) => sum + e.amount, 0),
      rejected: rejected.length,
      rejectedAmount: rejected.reduce((sum, e) => sum + e.amount, 0),
      averageAmount: expenses.length > 0 ? totalAmount / expenses.length : 0
    };
  }
}

export const DEFAULT_EXPENSE_FILTER: ExpenseFilter = {
  page: 1,
  pageSize: 20,
  sortBy: 'date',
  sortOrder: 'desc'
};


export interface ExpenseStatisticsDto {
  /** Montant total des dépenses */
  totalAmount: number;
  /** Nombre total de dépenses */
  totalCount: number;
  /** Montant par catégorie de dépense */
  amountByCategory: Record<ExpenseCategory, number>;
  /** Nombre par catégorie de dépense */
  countByCategory: Record<ExpenseCategory, number>;
  /** Nombre par statut de dépense */
  countByStatus: Record<ExpenseStatus, number>;
  /** Nombre par mode de paiement */
  countByPaymentMethod: Record<PaymentMethod, number>;
  /** Dépenses récentes (10 dernières) */
  recentExpenses: ExpenseListResponse[];
  /** Total du mois en cours */
  thisMonthTotal: number;
  /** Total de la semaine en cours */
  thisWeekTotal: number;
  /** Montant moyen d'une dépense */
  averageExpense: number;
}


/**
 * Utilitaires pour les statistiques des dépenses
 */
export class ExpenseStatisticsUtils {
  /**
   * Calcule le pourcentage d'une valeur par rapport au total
   */
  static getPercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  /**
   * Formate un montant en devise
   */
  static formatAmount(amount: number, currency: string = 'FCFA'): string {
    return `${amount.toLocaleString('fr-FR')} ${currency}`;
  }

  /**
   * Obtient les catégories les plus importantes (par montant)
   */
  static getTopCategories(
    stats: ExpenseStatisticsDto,
    limit: number = 5
  ): { category: ExpenseCategory; amount: number }[] {
    return Object.entries(stats.amountByCategory)
      .map(([key, value]) => ({
        category: key as ExpenseCategory,
        amount: value
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  }

  /**
   * Filtre les statistiques par catégorie
   */
  static filterByCategory(
    stats: ExpenseStatisticsDto,
    categories: ExpenseCategory[]
  ): ExpenseStatisticsDto {
    return {
      ...stats,
      amountByCategory: Object.fromEntries(
        Object.entries(stats.amountByCategory).filter(([key]) =>
          categories.includes(key as ExpenseCategory)
        )
      ) as Record<ExpenseCategory, number>,
      countByCategory: Object.fromEntries(
        Object.entries(stats.countByCategory).filter(([key]) =>
          categories.includes(key as ExpenseCategory)
        )
      ) as Record<ExpenseCategory, number>
    };
  }

  /**
   * Calcule le taux de variation mensuel
   */
  static getMonthlyChange(stats: ExpenseStatisticsDto): number {
    // Note : Cette méthode suppose que vous avez un historique mensuel.
    // Vous pouvez l'adapter selon vos besoins.
    return 0;
  }
}
