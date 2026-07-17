
/**
 * DTO pour la comparaison budget / réalisé
 * Correspond à BudgetComparisonDto en C#
 */
export interface BudgetComparisonDto {
  /** ID du budget */
  budgetId: string;
  /** Nom du budget */
  budgetName: string;
  /** Année du budget */
  year: number;
  /** Montant total alloué */
  totalAllocated: number;
  /** Montant total dépensé */
  totalSpent: number;
  /** Montant restant */
  remaining: number;
  /** Taux d'utilisation global (en %) */
  utilizationRate: number;
  /** Comparaison par catégorie */
  categories: CategoryComparisonDto[];
}

/**
 * DTO pour la comparaison par catégorie
 * Correspond à CategoryComparisonDto en C#
 */
export interface CategoryComparisonDto {
  /** Nom de la catégorie */
  name: string;
  /** Code de la catégorie */
  code: string;
  /** Montant alloué */
  allocated: number;
  /** Montant dépensé */
  spent: number;
  /** Montant restant */
  remaining: number;
  /** Taux d'utilisation (en %) */
  utilizationRate: number;
}

// ──────────────────────────────────────────────────────────────
// 📊 VALEURS PAR DÉFAUT
// ──────────────────────────────────────────────────────────────

/**
 * Valeurs par défaut pour la comparaison d'un budget
 */
export const DEFAULT_BUDGET_COMPARISON: BudgetComparisonDto = {
  budgetId: '',
  budgetName: '',
  year: new Date().getFullYear(),
  totalAllocated: 0,
  totalSpent: 0,
  remaining: 0,
  utilizationRate: 0,
  categories: []
};

/**
 * Valeurs par défaut pour une catégorie de comparaison
 */
export const DEFAULT_CATEGORY_COMPARISON: CategoryComparisonDto = {
  name: '',
  code: '',
  allocated: 0,
  spent: 0,
  remaining: 0,
  utilizationRate: 0
};

// ──────────────────────────────────────────────────────────────
// 🛠️ CLASSES UTILITAIRES
// ──────────────────────────────────────────────────────────────

/**
 * Utilitaires pour la comparaison budget / réalisé
 */
export class BudgetComparisonUtils {
  /**
   * Calcule le taux d'utilisation pour un montant
   */
  static getUtilizationRate(allocated: number, spent: number): number {
    if (allocated === 0) return 0;
    return Math.round((spent / allocated) * 100);
  }

  /**
   * Obtient la couleur du taux d'utilisation
   */
  static getUtilizationColor(rate: number): string {
    if (rate < 60) return 'success';      // Vert - budget bien maîtrisé
    if (rate < 80) return 'warning';      // Orange - budget sous contrôle
    if (rate < 95) return 'orange';       // Orange foncé - vigilance
    if (rate < 100) return 'danger';      // Rouge - presque atteint
    return 'danger';                       // Rouge - budget dépassé
  }

  /**
   * Obtient une icône pour le taux d'utilisation
   */
  static getUtilizationIcon(rate: number): string {
    if (rate < 60) return 'fa-check-circle';
    if (rate < 80) return 'fa-chart-line';
    if (rate < 95) return 'fa-exclamation-triangle';
    return 'fa-times-circle';
  }

  /**
   * Vérifie si une catégorie est en sur-utilisation
   */
  static isOverBudget(category: CategoryComparisonDto): boolean {
    return category.utilizationRate > 100;
  }

  /**
   * Calcule le pourcentage de catégories en bonne santé
   */
  static getHealthScore(comparison: BudgetComparisonDto): number {
    if (comparison.categories.length === 0) return 0;
    const healthy = comparison.categories.filter(c => c.utilizationRate < 90);
    return Math.round((healthy.length / comparison.categories.length) * 100);
  }

  /**
   * Filtre les catégories par statut de santé
   */
  static filterCategories(
    comparison: BudgetComparisonDto,
    healthy: boolean = true
  ): CategoryComparisonDto[] {
    return comparison.categories.filter(c => {
      const isHealthy = c.utilizationRate < 90;
      return healthy ? isHealthy : !isHealthy;
    });
  }

  /**
   * Tri des catégories par taux d'utilisation (décroissant)
   */
  static sortCategoriesByUtilization(
    comparison: BudgetComparisonDto,
    ascending: boolean = false
  ): CategoryComparisonDto[] {
    return [...comparison.categories].sort((a, b) => {
      const diff = a.utilizationRate - b.utilizationRate;
      return ascending ? diff : -diff;
    });
  }

  /**
   * Récupère les catégories critiques (> 90% d'utilisation)
   */
  static getCriticalCategories(comparison: BudgetComparisonDto): CategoryComparisonDto[] {
    return comparison.categories.filter(c => c.utilizationRate >= 90);
  }

  /**
   * Récupère les catégories saines (< 80% d'utilisation)
   */
  static getHealthyCategories(comparison: BudgetComparisonDto): CategoryComparisonDto[] {
    return comparison.categories.filter(c => c.utilizationRate < 80);
  }
}
