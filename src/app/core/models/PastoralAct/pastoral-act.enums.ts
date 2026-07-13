
/**
 * Types d'actes pastoraux
 * Correspond à PastoralActType en C#
 */
export enum PastoralActType {
  /** Baptême */
  Baptism = 'Baptism',
  /** Mariage */
  Wedding = 'Wedding',
  /** Funérailles */
  Funeral = 'Funeral',
  /** Dédicace d'enfant */
  ChildDedication = 'ChildDedication',
  /** Autre */
  Other = 'Other'
}

/**
 * Libellés pour l'affichage des types d'actes
 */
export const PastoralActTypeLabels: Record<PastoralActType, string> = {
  [PastoralActType.Baptism]: 'Baptême',
  [PastoralActType.Wedding]: 'Mariage',
  [PastoralActType.Funeral]: 'Funérailles',
  [PastoralActType.ChildDedication]: 'Dédicace d\'enfant',
  [PastoralActType.Other]: 'Autre'
};

/**
 * Icônes pour les types d'actes
 */
export const PastoralActTypeIcons: Record<PastoralActType, string> = {
  [PastoralActType.Baptism]: '💧',
  [PastoralActType.Wedding]: '💍',
  [PastoralActType.Funeral]: '🕊️',
  [PastoralActType.ChildDedication]: '👶',
  [PastoralActType.Other]: '📋'
};

/**
 * Couleurs pour les types d'actes
 */
export const PastoralActTypeColors: Record<PastoralActType, string> = {
  [PastoralActType.Baptism]: 'info',
  [PastoralActType.Wedding]: 'success',
  [PastoralActType.Funeral]: 'danger',
  [PastoralActType.ChildDedication]: 'warning',
  [PastoralActType.Other]: 'secondary'
};
