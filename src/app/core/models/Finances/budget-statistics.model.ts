import { BudgetStatus } from "./budget.model";

/**
 * DTO pour les statistiques des budgets
 * Correspond à BudgetStatisticsDto en C#
 */
export interface BudgetStatisticsDto {
  /** Nombre total de budgets */
  totalBudgets: number;
  /** Nombre de budgets en brouillon */
  draftCount: number;
  /** Nombre de budgets en attente */
  pendingCount: number;
  /** Nombre de budgets approuvés */
  approvedCount: number;
  /** Nombre de budgets rejetés */
  rejectedCount: number;
  /** Nombre de budgets clôturés */
  closedCount: number;
  /** Montant total alloué */
  totalAllocated: number;
  /** Montant total dépensé */
  totalSpent: number;
  /** Montant total restant */
  totalRemaining: number;
  /** Taux d'utilisation global (en %) */
  utilizationRate: number;
  /** Montant alloué par catégorie (clé = code catégorie, valeur = montant) */
  allocatedByCategory: Record<string, number>;
  /** Montant dépensé par catégorie (clé = code catégorie, valeur = montant) */
  spentByCategory: Record<string, number>;
  /** 5 budgets les plus récents */
  recentBudgets: BudgetResponseDto[];
  /** Montant alloué par année (clé = année, valeur = montant) */
  allocatedByYear: Record<number, number>;
  /** Montant moyen d'un budget */
  averageBudget: number;
}


/**
 * DTO pour la réponse d'un budget
 * Correspond à BudgetResponseDto en C#
 */
export interface BudgetResponseDto {
  /** ID du budget */
  id: string;
  /** Nom du budget */
  name: string;
  /** Année du budget */
  year: number;
  /** ID de l'église */
  churchId: string;
  /** Nom de l'église */
  churchName?: string;
  /** ID du site */
  siteId?: string;
  /** Nom du site */
  siteName?: string;
  /** Liste des catégories */
  categories: BudgetCategoryDto[];
  /** Statut du budget */
  status: BudgetStatus;
  /** Libellé du statut */
  statusLabel: string;
  /** Couleur du statut */
  statusColor: string;
  /** IDs des approbateurs */
  approvedBy: string[];
  /** Noms des approbateurs */
  approvedByNames: string[];
  /** Date d'approbation */
  approvedAt?: string;
  /** Date de création */
  createdAt: string;
  /** Date de mise à jour */
  updatedAt?: string;
  /** ID du créateur */
  createdBy: string;
  /** Montant total alloué */
  totalBudget: number;
  /** Montant total dépensé */
  totalSpent: number;
  /** Montant total restant (calculé) */
  totalRemaining: number;
  /** Taux d'utilisation global (calculé) */
  utilizationRate: number;
  /** Date de création formatée */
  formattedCreatedAt: string;
  /** Date d'approbation formatée */
  formattedApprovedAt?: string;
}


/**
 * DTO pour une catégorie de budget
 * Correspond à BudgetCategoryDto en C#
 */
export interface BudgetCategoryDto {
  /** Nom de la catégorie */
  name: string;
  /** Code de la catégorie (ex: SALARIES, RENT) */
  code: string;
  /** Montant alloué */
  allocated: number;
  /** Montant dépensé */
  spent: number;
  /** Montant restant (calculé) */
  remaining: number;
  /** Notes (optionnel) */
  notes?: string;
  /** Taux d'utilisation (calculé) */
  utilizationRate: number;
}

// ──────────────────────────────────────────────────────────────
// 📊 VALEURS PAR DÉFAUT
// ──────────────────────────────────────────────────────────────

/**
 * Valeurs par défaut pour les statistiques des budgets
 */
export const DEFAULT_BUDGET_STATISTICS: BudgetStatisticsDto = {
  totalBudgets: 0,
  draftCount: 0,
  pendingCount: 0,
  approvedCount: 0,
  rejectedCount: 0,
  closedCount: 0,
  totalAllocated: 0,
  totalSpent: 0,
  totalRemaining: 0,
  utilizationRate: 0,
  allocatedByCategory: {},
  spentByCategory: {},
  recentBudgets: [],
  allocatedByYear: {},
  averageBudget: 0
};

// ──────────────────────────────────────────────────────────────
// 🛠️ CLASSES UTILITAIRES
// ──────────────────────────────────────────────────────────────

/**
 * Utilitaires pour les statistiques des budgets
 */
export class BudgetStatisticsUtils {
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
   * Obtient le taux d'utilisation en pourcentage
   */
  static getUtilizationRate(allocated: number, spent: number): number {
    if (allocated === 0) return 0;
    return Math.round((spent / allocated) * 100);
  }

  /**
   * Obtient la couleur du statut d'un budget
   */
  static getStatusColor(status: BudgetStatus): string {
    const colors: Record<BudgetStatus, string> = {
      [BudgetStatus.Draft]: 'secondary',
      [BudgetStatus.Pending]: 'warning',
      [BudgetStatus.Approved]: 'success',
      [BudgetStatus.Rejected]: 'danger',
      [BudgetStatus.Closed]: 'info'
    };
    return colors[status] || 'secondary';
  }

  /**
   * Obtient le libellé du statut d'un budget
   */
  static getStatusLabel(status: BudgetStatus): string {
    const labels: Record<BudgetStatus, string> = {
      [BudgetStatus.Draft]: 'Brouillon',
      [BudgetStatus.Pending]: 'En attente',
      [BudgetStatus.Approved]: 'Approuvé',
      [BudgetStatus.Rejected]: 'Rejeté',
      [BudgetStatus.Closed]: 'Clôturé'
    };
    return labels[status] || status;
  }

  /**
   * Obtient les catégories les plus importantes (par allocation)
   */
  static getTopCategories(
    stats: BudgetStatisticsDto,
    limit: number = 5
  ): { code: string; allocated: number; spent: number }[] {
    return Object.entries(stats.allocatedByCategory)
      .map(([code, allocated]) => ({
        code,
        allocated,
        spent: stats.spentByCategory[code] || 0
      }))
      .sort((a, b) => b.allocated - a.allocated)
      .slice(0, limit);
  }

  /**
   * Obtient le taux de croissance annuel
   */
  static getAnnualGrowth(stats: BudgetStatisticsDto): number {
    const years = Object.keys(stats.allocatedByYear)
      .map(Number)
      .sort();

    if (years.length < 2) return 0;

    const lastYear = years[years.length - 1];
    const previousYear = years[years.length - 2];
    const current = stats.allocatedByYear[lastYear] || 0;
    const previous = stats.allocatedByYear[previousYear] || 0;

    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  /**
   * Vérifie si un budget est en bonne santé
   * (utilisation inférieure à 90% pour ne pas dépasser le budget)
   */
  static isHealthy(stats: BudgetStatisticsDto): boolean {
    return stats.utilizationRate < 90;
  }

  /**
   * Récupère la répartition par statut pour un graphique (donut)
   */
  static getStatusBreakdown(stats: BudgetStatisticsDto): { label: string; value: number; percentage: number }[] {
    const total = stats.totalBudgets;
    const statuses = [
      { status: BudgetStatus.Draft, label: 'Brouillon', count: stats.draftCount },
      { status: BudgetStatus.Pending, label: 'En attente', count: stats.pendingCount },
      { status: BudgetStatus.Approved, label: 'Approuvé', count: stats.approvedCount },
      { status: BudgetStatus.Rejected, label: 'Rejeté', count: stats.rejectedCount },
      { status: BudgetStatus.Closed, label: 'Clôturé', count: stats.closedCount }
    ];

    return statuses.map(s => ({
      label: s.label,
      value: s.count,
      percentage: this.getPercentage(s.count, total)
    }));
  }
}
