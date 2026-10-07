import { PastoralActType, PastoralActTypeColors, PastoralActTypeIcons, PastoralActTypeLabels } from './pastoral-act.enums';

/**
 * Participant à un acte pastoral
 * Correspond à PastoralActParticipant en C#
 */
export interface PastoralActParticipant {
  /** ID du membre (null si non-membre) */
  memberId: string | null;
  /** Prénom */
  firstName: string;
  /** Nom */
  lastName: string;
  /** Rôle (Époux, Épouse, Baptisé, Défunt, Parrain, Marraine) */
  role: string;
  /** Date de naissance */
  dateOfBirth: Date | null;
}

/**
 * Création d'un participant
 */
export interface PastoralActParticipantCreate {
  memberId?: string | null;
  firstName: string;
  lastName: string;
  role: string;
  dateOfBirth?: Date | string | null;
}

/**
 * Détails spécifiques selon le type d'acte
 * Correspond à PastoralActDetails en C#
 */
export interface PastoralActDetails {
  /** Régime matrimonial (Mariage) */
  marriageRegime?: string | null;
  /** Date de décès (Funérailles) */
  dateOfDeath?: Date | null;
  /** Lieu d'inhumation (Funérailles) */
  burialLocation?: string | null;
  /** Verset biblique (Baptême, Présentation d'enfant) */
  bibleVerse?: string | null;
  /** Liste des parrains/marraines */
  godparents?: string[];
  /** Titre d'ordination (Pasteur, Diacre, Ancien…) */
  ordinationTitle?: string | null;
}

/**
 * Création des détails d'un acte
 */
export interface PastoralActDetailsCreate {
  marriageRegime?: string | null;
  dateOfDeath?: Date | string | null;
  burialLocation?: string | null;
  bibleVerse?: string | null;
  godparents?: string[];
  ordinationTitle?: string | null;
}

/**
 * Acte pastoral (modèle complet)
 * Correspond à PastoralAct en C#
 */
export interface PastoralAct {
  /** Identifiant unique */
  id: string;
  /** Type d'acte */
  type: PastoralActType;
  /** Date de l'acte */
  date: Date;
  /** Lieu de l'acte */
  location: string | null;
  /** ID de l'officiant (pasteur) */
  officiantId: string;
  /** Nom de l'officiant */
  officiantName: string;
  /** Liste des participants */
  participants: PastoralActParticipant[];
  /** Liste des témoins */
  witnesses: string[];
  /** Numéro de certificat */
  certificateNumber: string | null;
  /** Certificat généré */
  certificateGenerated: boolean;
  /** URL du certificat */
  certificateUrl: string | null;
  /** Détails spécifiques */
  details: PastoralActDetails | null;
  /** ID de l'église */
  churchId: string;
  /** ID du site */
  siteId: string | null;
  /** Notes */
  notes: string | null;
  /** Date de création */
  createdAt: Date;
  /** Date de mise à jour */
  updatedAt: Date | null;
  /** Créé par (ID utilisateur) */
  createdBy: string;
}

/**
 * Version simplifiée pour les listes
 */
export interface PastoralActListItem {
  id: string;
  type: PastoralActType;
  date: Date;
  location: string | null;
  officiantName: string;
  participantsCount: number;
  certificateGenerated: boolean;
  createdAt: Date;
}

/**
 * Statistiques des actes pastoraux
 */
export interface PastoralActStatistics {
  /** Nombre total d'actes */
  total: number;
  /** Répartition par type */
  byType: Record<PastoralActType, number>;
  /** Répartition par mois (YYYY-MM) */
  byMonth: Record<string, number>;
  /** Nombre de certificats générés */
  certificatesGenerated: number;
  /** Actes récents (5 derniers) */
  recentActs: PastoralActListItem[];
  /** Actes par officiant */
  byOfficiant: Record<string, number>;
}

// ──────────────────────────────────────────────────────────────
// 🛠️ CLASSES UTILITAIRES
// ──────────────────────────────────────────────────────────────

/**
 * Utilitaires pour les actes pastoraux
 */
export class PastoralActUtils {
  /**
   * Récupère le libellé du type d'acte
   */
  static getTypeLabel(type: PastoralActType): string {
    return PastoralActTypeLabels[type] || type;
  }

  /**
   * Récupère l'icône du type d'acte
   */
  static getTypeIcon(type: PastoralActType): string {
    return PastoralActTypeIcons[type] || '📋';
  }

  /**
   * Récupère la couleur du type d'acte
   */
  static getTypeColor(type: PastoralActType): string {
    return PastoralActTypeColors[type] || 'secondary';
  }

  /**
   * Obtient le nom complet d'un participant
   */
  static getParticipantFullName(participant: PastoralActParticipant): string {
    return `${participant.firstName} ${participant.lastName}`.trim();
  }

  /**
   * Formate la date pour l'affichage
   */
  static formatDate(date: Date | string | null | undefined): string {
    if (!date) return 'Non renseigné';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Date invalide';
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Formate la date et l'heure pour l'affichage
   */
  static formatDateTime(date: Date | string | null | undefined): string {
    if (!date) return 'Non renseigné';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Date invalide';
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Vérifie si un acte est récent (moins de 30 jours)
   */
  static isRecent(act: PastoralAct): boolean {
    const days = 30;
    const now = new Date();
    const diff = now.getTime() - new Date(act.date).getTime();
    return diff < days * 24 * 60 * 60 * 1000;
  }

  /**
   * Vérifie si un certificat peut être généré
   */
  static canGenerateCertificate(act: PastoralAct): boolean {
    return !act.certificateGenerated && act.type !== PastoralActType.Funeral;
  }

  /**
   * Obtenir le rôle principal d'un participant
   */
  static getMainParticipantRole(participant: PastoralActParticipant): string {
    const mainRoles = ['Baptisé(e)', 'Baptisé', 'Époux', 'Épouse', 'Défunt(e)', 'Défunt', 'Enfant', 'Ordonné(e)'];
    if (mainRoles.includes(participant.role)) {
      return participant.role;
    }
    return 'Participant';
  }

  /**
   * Filtre les participants par rôle
   */
  static filterParticipantsByRole(
    participants: PastoralActParticipant[],
    role: string
  ): PastoralActParticipant[] {
    return participants.filter(p => p.role === role);
  }

  /**
   * Obtient le participant principal
   */
  static getMainParticipant(act: PastoralAct): PastoralActParticipant | null {
    return act.participants.find(p => isMainRole(act.type, p.role)) || null;
  }

  /**
   * Obtient les options pour les listes déroulantes
   */
  static getTypeOptions(): { value: PastoralActType; label: string }[] {
    return Object.entries(PastoralActTypeLabels).map(([value, label]) => ({
      value: value as PastoralActType,
      label
    }));
  }

  /**
   * Crée une instance vide d'un acte pastoral
   */
  static createEmpty(): Partial<PastoralAct> {
    return {
      type: PastoralActType.Other,
      date: new Date(),
      location: null,
      participants: [],
      witnesses: [],
      details: null,
      notes: null
    };
  }
}

// ──────────────────────────────────────────────────────────────
// 📊 CONSTANTES
// ──────────────────────────────────────────────────────────────

/**
 * Référentiel des rôles de participants PAR type d'acte pastoral.
 * Le premier rôle de chaque liste est le rôle principal (présélectionné).
 * Source unique — miroir de PastoralActRoles.cs (backend).
 */
export const PASTORAL_ACT_ROLES = {
  Baptism: ['Baptisé(e)', 'Parrain', 'Marraine', 'Officiant'] as const,
  Wedding: ['Époux', 'Épouse', 'Témoin Époux', 'Témoin Épouse', 'Officiant'] as const,
  Funeral: ['Défunt(e)', 'Famille', 'Ami(e)', 'Officiant'] as const,
  ChildDedication: ['Enfant', 'Père', 'Mère', 'Parrain', 'Marraine', 'Officiant'] as const,
  Ordination: ['Ordonné(e)', 'Parrain d\'ordination', 'Marraine d\'ordination', 'Officiant'] as const,
  Other: ['Participant', 'Témoin', 'Officiant'] as const
} as const;

/** Rôles disponibles pour un type d'acte (tableau simple). */
export function getRolesForType(type: PastoralActType): string[] {
  return [...(PASTORAL_ACT_ROLES[type] ?? PASTORAL_ACT_ROLES.Other)];
}

/** Rôle principal (sujet de l'acte), présélectionné dans le formulaire. */
export function getPrimaryRoleForType(type: PastoralActType): string {
  return getRolesForType(type)[0] ?? 'Participant';
}

/**
 * Rôles des parties principales (sujets) de l'acte, dans l'ordre.
 * Sert à présélectionner les participants (1er = 1er sujet, 2e = 2e sujet).
 */
export function getMainRolesForType(type: PastoralActType): string[] {
  switch (type) {
    case PastoralActType.Wedding: return ['Époux', 'Épouse'];
    case PastoralActType.Baptism: return ['Baptisé(e)'];
    case PastoralActType.ChildDedication: return ['Enfant'];
    case PastoralActType.Ordination: return ['Ordonné(e)'];
    case PastoralActType.Funeral: return ['Défunt(e)'];
    default: return ['Participant'];
  }
}

/** Synonymes hérités (actes déjà enregistrés) des rôles principaux. */
const MAIN_ROLE_ALIASES: Record<string, string[]> = {
  'Baptisé(e)': ['Baptisé', 'baptise'],
  'Défunt(e)': ['Défunt'],
};

/** Vrai si le rôle est une partie principale (sujet), tolérant aux variantes héritées. */
export function isMainRole(type: PastoralActType, role: string | null | undefined): boolean {
  if (!role) return false;
  const normalized = role.trim().toLowerCase();
  return getMainRolesForType(type).some((r) => {
    if (r.toLowerCase() === normalized) return true;
    return (MAIN_ROLE_ALIASES[r] ?? []).some((a) => a.toLowerCase() === normalized);
  });
}

export const PASTORAL_ACT_DEFAULT_VALUES = {
  page: 1,
  pageSize: 20,
  sortOrder: 'desc' as const
};
