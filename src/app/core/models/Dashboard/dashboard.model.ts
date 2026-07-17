import { OfferingType, OfferingStatus } from '../Finances/offering.model';

// ──────────────────────────────────────────────────────────────
// 📊 DTO PRINCIPAL DU DASHBOARD
// ──────────────────────────────────────────────────────────────

/**
 * DTO principal du tableau de bord
 * Correspond à DashboardDto en C#
 */
export interface DashboardDto {
  /** Nombre total de membres */
  totalMembers: number;
  /** Nombre de membres actifs */
  activeMembers: number;
  /** Nombre total de cellules */
  totalCells: number;
  /** Nombre d'événements à venir */
  upcomingEvents: number;
  /** Collecte du mois en cours */
  monthlyCollection: number;
  /** Taux de présence moyen */
  averageAttendanceRate: number;

  /** Répartition par sexe */
  genderDistribution: GenderDistributionDto;
  /** Répartition par âge */
  ageDistribution: AgeDistributionDto;
  /** Offrandes par type (diagramme en bandes) */
  offeringsByType: OfferingByTypeDto;
  /** Tendance des présences (courbe) */
  attendanceTrend: AttendanceTrendDto;

  /** 10 derniers membres */
  recentMembers: RecentMemberDto[];
  /** 10 dernières offrandes */
  recentOfferings: RecentOfferingDto[];
}

// ──────────────────────────────────────────────────────────────
// 👤 RÉPARTITION PAR SEXE
// ──────────────────────────────────────────────────────────────

/**
 * Répartition des membres par sexe
 * Correspond à GenderDistributionDto en C#
 */
export interface GenderDistributionDto {
  /** Nombre d'hommes */
  male: number;
  /** Nombre de femmes */
  female: number;
  /** Nombre d'autres (non binaire, etc.) */
  other: number;
  /** Nombre non renseigné */
  unknown: number;
  /** Liste des items pour le graphique */
  items: GenderItemDto[];
}

/**
 * Item de répartition par sexe
 * Correspond à GenderItemDto en C#
 */
export interface GenderItemDto {
  /** Libellé (Hommes, Femmes, Autre, Non renseigné) */
  label: string;
  /** Nombre */
  count: number;
  /** Pourcentage */
  percentage: number;
}

// ──────────────────────────────────────────────────────────────
// 📊 RÉPARTITION PAR ÂGE
// ──────────────────────────────────────────────────────────────

/**
 * Répartition des membres par tranche d'âge
 * Correspond à AgeDistributionDto en C#
 */
export interface AgeDistributionDto {
  /** 0-12 ans */
  children: number;
  /** 13-17 ans */
  teens: number;
  /** 18-30 ans */
  youngAdults: number;
  /** 31-50 ans */
  adults: number;
  /** 51+ ans */
  seniors: number;
  /** Non renseigné */
  unknown: number;
  /** Liste des items pour le graphique */
  items: AgeGroupItemDto[];
}

/**
 * Item de répartition par tranche d'âge
 * Correspond à AgeGroupItemDto en C#
 */
export interface AgeGroupItemDto {
  /** Libellé de la tranche (ex: "18-30 ans") */
  label: string;
  /** Nombre */
  count: number;
  /** Pourcentage */
  percentage: number;
}

// ──────────────────────────────────────────────────────────────
// 💰 OFFRANDES PAR TYPE
// ──────────────────────────────────────────────────────────────

/**
 * Offrandes par type (diagramme en bandes)
 * Correspond à OfferingByTypeDto en C#
 */
export interface OfferingByTypeDto {
  /** Liste des items */
  items: OfferingTypeItemDto[];
  /** Montant total */
  total: number;
}

/**
 * Item des offrandes par type
 * Correspond à OfferingTypeItemDto en C#
 */
export interface OfferingTypeItemDto {
  /** Type d'offrande */
  type: OfferingType;
  /** Libellé du type */
  label: string;
  /** Icône FontAwesome */
  icon: string;
  /** Montant */
  amount: number;
  /** Pourcentage du total */
  percentage: number;
}

// ──────────────────────────────────────────────────────────────
// 📈 TENDANCE DES PRÉSENCES
// ──────────────────────────────────────────────────────────────

/**
 * Tendance des présences (courbe)
 * Correspond à AttendanceTrendDto en C#
 */
export interface AttendanceTrendDto {
  /** Points de la courbe */
  points: AttendancePointDto[];
  /** Présence moyenne */
  averageAttendance: number;
  /** Nombre total de services */
  totalServices: number;
}

/**
 * Point de la courbe des présences
 * Correspond à AttendancePointDto en C#
 */
export interface AttendancePointDto {
  /** Date du service (format "yyyy-MM-dd") */
  date: string;
  /** Nombre de participants */
  attendance: number;
  /** Titre du service */
  serviceTitle: string;
}

// ──────────────────────────────────────────────────────────────
// 👤 DERNIERS MEMBRES
// ──────────────────────────────────────────────────────────────

/**
 * Dernier membre (liste récente)
 * Correspond à RecentMemberDto en C#
 */
export interface RecentMemberDto {
  /** ID du membre */
  id: string;
  /** Prénom */
  firstName: string;
  /** Nom */
  lastName: string;
  /** Nom complet */
  fullName: string;
  /** URL de la photo */
  photoUrl?: string;
  /** Statut du membre */
  status: string;
  /** Nom de la cellule */
  cellGroupName?: string;
  /** Date de création */
  createdAt: Date | string;
}

// ──────────────────────────────────────────────────────────────
// 💰 DERNIÈRES OFFRANDES
// ──────────────────────────────────────────────────────────────

/**
 * Dernière offrande (liste récente)
 * Correspond à RecentOfferingDto en C#
 */
export interface RecentOfferingDto {
  /** ID de l'offrande */
  id: string;
  /** Type d'offrande */
  type: OfferingType;
  /** Libellé du type */
  typeLabel: string;
  /** Icône FontAwesome */
  typeIcon: string;
  /** Montant */
  amount: number;
  /** Devise */
  currency: string;
  /** Nom du membre (anonyme si null) */
  memberName?: string;
  /** Date de l'offrande */
  date: Date | string;
  /** Statut de l'offrande */
  status: OfferingStatus;
  /** Libellé du statut */
  statusLabel: string;
}

// ──────────────────────────────────────────────────────────────
// 📊 DTO SPÉCIFIQUES (KPIs et Graphiques)
// ──────────────────────────────────────────────────────────────

/**
 * DTO des indicateurs principaux (KPI)
 * Correspond à DashboardKpiDto en C#
 */
export interface DashboardKpiDto {
  /** Nombre total de membres */
  totalMembers: number;
  /** Nombre de membres actifs */
  activeMembers: number;
  /** Nombre total de cellules */
  totalCells: number;
  /** Nombre d'événements à venir */
  upcomingEvents: number;
  /** Collecte du mois en cours */
  monthlyCollection: number;
  /** Taux de présence moyen */
  averageAttendanceRate: number;
}

/**
 * DTO des données des graphiques
 * Correspond à DashboardChartsDto en C#
 */
export interface DashboardChartsDto {
  /** Répartition par sexe */
  genderDistribution: GenderDistributionDto;
  /** Répartition par âge */
  ageDistribution: AgeDistributionDto;
  /** Offrandes par type */
  offeringsByType: OfferingByTypeDto;
  /** Tendance des présences */
  attendanceTrend: AttendanceTrendDto;
}

// ──────────────────────────────────────────────────────────────
// 📊 VALEURS PAR DÉFAUT
// ──────────────────────────────────────────────────────────────

/**
 * Valeurs par défaut pour le Dashboard
 */
export const DEFAULT_DASHBOARD: DashboardDto = {
  totalMembers: 0,
  activeMembers: 0,
  totalCells: 0,
  upcomingEvents: 0,
  monthlyCollection: 0,
  averageAttendanceRate: 0,
  genderDistribution: {
    male: 0,
    female: 0,
    other: 0,
    unknown: 0,
    items: []
  },
  ageDistribution: {
    children: 0,
    teens: 0,
    youngAdults: 0,
    adults: 0,
    seniors: 0,
    unknown: 0,
    items: []
  },
  offeringsByType: {
    items: [],
    total: 0
  },
  attendanceTrend: {
    points: [],
    averageAttendance: 0,
    totalServices: 0
  },
  recentMembers: [],
  recentOfferings: []
};

/**
 * Valeurs par défaut pour les KPIs
 */
export const DEFAULT_DASHBOARD_KPI: DashboardKpiDto = {
  totalMembers: 0,
  activeMembers: 0,
  totalCells: 0,
  upcomingEvents: 0,
  monthlyCollection: 0,
  averageAttendanceRate: 0
};

/**
 * Valeurs par défaut pour les graphiques
 */
export const DEFAULT_DASHBOARD_CHARTS: DashboardChartsDto = {
  genderDistribution: {
    male: 0,
    female: 0,
    other: 0,
    unknown: 0,
    items: []
  },
  ageDistribution: {
    children: 0,
    teens: 0,
    youngAdults: 0,
    adults: 0,
    seniors: 0,
    unknown: 0,
    items: []
  },
  offeringsByType: {
    items: [],
    total: 0
  },
  attendanceTrend: {
    points: [],
    averageAttendance: 0,
    totalServices: 0
  }
};

// ──────────────────────────────────────────────────────────────
// 🛠️ CLASSES UTILITAIRES
// ──────────────────────────────────────────────────────────────

/**
 * Utilitaires pour le Dashboard
 */
export class DashboardUtils {
  static getOfferingTypeLabel(type: OfferingType): string {
    throw new Error('Method not implemented.');
  }
  static getOfferingStatusLabel(status: OfferingStatus): string {
    throw new Error('Method not implemented.');
  }
  /**
   * Formate un montant en devise
   */
  static formatAmount(amount: number, currency: string = 'FCFA'): string {
    return `${amount.toLocaleString('fr-FR')} ${currency}`;
  }

  /**
   * Calcule le pourcentage d'une valeur par rapport au total
   */
  static getPercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  /**
   * Obtient la couleur du statut d'un membre
   */
  static getMemberStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'Active': 'success',
      'Adherent': 'info',
      'Visitor': 'warning',
      'Inactive': 'secondary',
      'ExMember': 'danger'
    };
    return colors[status] || 'secondary';
  }

  /**
   * Obtient le libellé du statut d'un membre
   */
  static getMemberStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'Active': 'Actif',
      'Adherent': 'Adhérent',
      'Visitor': 'Visiteur',
      'Inactive': 'Inactif',
      'ExMember': 'Ancien membre'
    };
    return labels[status] || status;
  }

  /**
   * Calcule le taux d'évolution mensuel
   */
  static getMonthlyGrowth(current: number, previous: number): number {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  /**
   * Prépare les données pour un graphique circulaire (donut)
   */
  static prepareDonutData(items: { label: string; count: number; percentage: number }[]): {
    labels: string[];
    data: number[];
    percentages: number[];
  } {
    return {
      labels: items.map(item => item.label),
      data: items.map(item => item.count),
      percentages: items.map(item => item.percentage)
    };
  }

  /**
   * Prépare les données pour un graphique en barres (offrandes)
   */
  static prepareBarData(items: OfferingTypeItemDto[]): {
    labels: string[];
    data: number[];
    colors: string[];
    total: number;
  } {
    const colors: Record<string, string> = {
      'Tithe': '#4A90D9',
      'SundayOffering': '#2ECC71',
      'SpecialOffering': '#F39C12',
      'BuildingFund': '#9B59B6',
      'Mission': '#1ABC9C',
      'Seed': '#E74C3C',
      'Thanksgiving': '#F1C40F',
      'Other': '#95A5A6'
    };

    return {
      labels: items.map(item => item.label),
      data: items.map(item => item.amount),
      colors: items.map(item => colors[item.type] || '#95A5A6'),
      total: items.reduce((sum, item) => sum + item.amount, 0)
    };
  }

  /**
   * Prépare les données pour un graphique en courbe (présences)
   */
  static prepareLineData(points: AttendancePointDto[]): {
    labels: string[];
    data: number[];
    titles: string[];
  } {
    return {
      labels: points.map(point => point.date),
      data: points.map(point => point.attendance),
      titles: points.map(point => point.serviceTitle)
    };
  }

  /**
   * Formate une date pour l'affichage
   */
  static formatDate(date: Date | string): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Formate une date et heure pour l'affichage
   */
  static formatDateTime(date: Date | string): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Obtient la couleur pour un taux de présence
   */
  static getAttendanceColor(rate: number): string {
    if (rate >= 80) return 'success';
    if (rate >= 60) return 'warning';
    return 'danger';
  }

  /**
   * Obtient le libellé pour un taux de présence
   */
  static getAttendanceLabel(rate: number): string {
    if (rate >= 80) return 'Excellent';
    if (rate >= 60) return 'Bon';
    if (rate >= 40) return 'Moyen';
    return 'Faible';
  }

  /**
   * Compte le nombre total d'items dans une distribution
   */
  static getTotalItems(distribution: { items: { count: number }[] }): number {
    return distribution.items.reduce((sum, item) => sum + item.count, 0);
  }

  /**
   * Récupère le membre le plus récent
   */
  static getMostRecentMember(members: RecentMemberDto[]): RecentMemberDto | null {
    if (!members.length) return null;
    return members.reduce((a, b) =>
      new Date(a.createdAt) > new Date(b.createdAt) ? a : b
    );
  }

  /**
   * Récupère l'offrande la plus récente
   */
  static getMostRecentOffering(offerings: RecentOfferingDto[]): RecentOfferingDto | null {
    if (!offerings.length) return null;
    return offerings.reduce((a, b) =>
      new Date(a.date) > new Date(b.date) ? a : b
    );
  }

  /**
   * Calcule la somme totale des offrandes récentes
   */
  static getTotalRecentOfferings(offerings: RecentOfferingDto[]): number {
    return offerings.reduce((sum, o) => sum + o.amount, 0);
  }

  /**
   * Vérifie si le dashboard a des données
   */
  static hasData(dashboard: DashboardDto): boolean {
    return dashboard.totalMembers > 0 ||
           dashboard.activeMembers > 0 ||
           dashboard.totalCells > 0;
  }

  /**
   * Obtient la catégorie de membre la plus représentée
   */
  static getMostRepresentedCategory(distribution: GenderDistributionDto): GenderItemDto | null {
    if (!distribution.items.length) return null;
    return distribution.items.reduce((a, b) => a.count > b.count ? a : b);
  }

  /**
   * Obtient la tranche d'âge la plus représentée
   */
  static getMostRepresentedAgeGroup(distribution: AgeDistributionDto): AgeGroupItemDto | null {
    if (!distribution.items.length) return null;
    return distribution.items.reduce((a, b) => a.count > b.count ? a : b);
  }

  /**
   * Obtient le type d'offrande le plus important
   */
  static getTopOfferingType(offerings: OfferingByTypeDto): OfferingTypeItemDto | null {
    if (!offerings.items.length) return null;
    return offerings.items.reduce((a, b) => a.amount > b.amount ? a : b);
  }
}
