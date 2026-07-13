import { PastoralActType } from './pastoral-act.enums';
import {
  PastoralActParticipant,
  PastoralActParticipantCreate,
  PastoralActDetails,
  PastoralActDetailsCreate,
  PastoralAct,
  PastoralActListItem
} from './pastoral-act.models';

// ──────────────────────────────────────────────────────────────
// 📤 DTOs DE CRÉATION ET MISE À JOUR
// ──────────────────────────────────────────────────────────────

/**
 * DTO pour la création d'un acte pastoral
 * Correspond à PastoralActCreateDto en C#
 */
export interface PastoralActCreateDto {
  /** Type d'acte */
  type: PastoralActType;
  /** Date de l'acte */
  date: Date | string;
  /** Lieu de l'acte */
  location?: string | null;
  /** ID de l'officiant (pasteur) */
  officiantId: string;
  /** Liste des participants */
  participants: PastoralActParticipantCreate[];
  /** Liste des témoins */
  witnesses?: string[];
  /** Détails spécifiques */
  details?: PastoralActDetailsCreate | null;
  /** ID de l'église */
  churchId: string;
  /** ID du site */
  siteId?: string | null;
  /** Notes */
  notes?: string | null;
  /** ID du créateur (audit) */
  userId?: string | null;
}

/**
 * DTO pour la mise à jour d'un acte pastoral
 * Correspond à PastoralActUpdateDto en C#
 */
export interface PastoralActUpdateDto {
  /** Date de l'acte */
  date?: Date | string | null;
  /** Lieu de l'acte */
  location?: string | null;
  /** ID de l'officiant */
  officiantId?: string | null;
  /** Liste des participants */
  participants?: PastoralActParticipantCreate[] | null;
  /** Liste des témoins */
  witnesses?: string[] | null;
  /** Détails spécifiques */
  details?: PastoralActDetailsCreate | null;
  /** ID du site */
  siteId?: string | null;
  /** Notes */
  notes?: string | null;
  /** Numéro de certificat */
  certificateNumber?: string | null;
  /** Certificat généré */
  certificateGenerated?: boolean | null;
  /** URL du certificat */
  certificateUrl?: string | null;
}

// ──────────────────────────────────────────────────────────────
// 📥 DTOs DE RÉPONSE
// ──────────────────────────────────────────────────────────────

/**
 * DTO de réponse pour un acte pastoral
 * Correspond à PastoralActResponseDto en C#
 */
export interface PastoralActResponseDto {
  /** Succès de l'opération */
  isSuccess: boolean;
  /** Message d'erreur */
  errorMessage?: string | null;
  /** Liste des erreurs */
  errors?: string[];

  /** ID de l'acte */
  id: string;
  /** Type d'acte */
  type: PastoralActType;
  /** Date de l'acte */
  date: Date | string;
  /** Lieu de l'acte */
  location: string | null;
  /** ID de l'officiant */
  officiantId: string;
  /** Nom de l'officiant */
  officiantName: string;
  /** Participants */
  participants: PastoralActParticipant[];
  /** Témoins */
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
  createdAt: Date | string;
  /** Date de mise à jour */
  updatedAt: Date | string | null;
  /** Créé par */
  createdBy: string;
}

/**
 * Factory pour créer une réponse de succès
 */
export function createSuccessResponse(data: Partial<PastoralActResponseDto>): PastoralActResponseDto {
  return {
    isSuccess: true,
    id: data.id || '',
    type: data.type || PastoralActType.Other,
    date: data.date || new Date(),
    location: data.location || null,
    officiantId: data.officiantId || '',
    officiantName: data.officiantName || '',
    participants: data.participants || [],
    witnesses: data.witnesses || [],
    certificateNumber: data.certificateNumber || null,
    certificateGenerated: data.certificateGenerated || false,
    certificateUrl: data.certificateUrl || null,
    details: data.details || null,
    churchId: data.churchId || '',
    siteId: data.siteId || null,
    notes: data.notes || null,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || null,
    createdBy: data.createdBy || '',
    errorMessage: null,
    errors: []
  };
}

/**
 * Factory pour créer une réponse d'erreur
 */
export function createErrorResponse(message: string, errors?: string[]): PastoralActResponseDto {
  return {
    isSuccess: false,
    errorMessage: message,
    errors: errors || [message],
    id: '',
    type: PastoralActType.Other,
    date: new Date(),
    location: null,
    officiantId: '',
    officiantName: '',
    participants: [],
    witnesses: [],
    certificateNumber: null,
    certificateGenerated: false,
    certificateUrl: null,
    details: null,
    churchId: '',
    siteId: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: null,
    createdBy: ''
  };
}

// ──────────────────────────────────────────────────────────────
// 🔍 DTOs DE FILTRE ET RECHERCHE
// ──────────────────────────────────────────────────────────────

/**
 * DTO pour le filtrage des actes pastoraux
 * Correspond à PastoralActFilterDto en C#
 */
export interface PastoralActFilterDto {
  /** Filtrer par type */
  type?: PastoralActType | null;
  /** Filtrer par participant */
  memberId?: string | null;
  /** Filtrer par officiant */
  officiantId?: string | null;
  /** Filtrer par église */
  churchId?: string | null;
  /** Filtrer par site */
  siteId?: string | null;
  /** Date de début */
  dateFrom?: Date | string | null;
  /** Date de fin */
  dateTo?: Date | string | null;
  /** Certificat généré */
  certificateGenerated?: boolean | null;
  /** Numéro de page */
  page: number;
  /** Taille de la page */
  pageSize: number;
  /** Champ de tri */
  sortBy?: string | null;
  /** Ordre de tri ('asc' ou 'desc') */
  sortOrder?: 'asc' | 'desc';
}

/**
 * DTO de réponse pour la liste paginée
 * Correspond à PastoralActListResponseDto en C#
 */
export interface PastoralActListResponseDto {
  /** Liste des actes */
  items: PastoralActResponseDto[];
  /** Nombre total */
  totalCount: number;
  /** Page actuelle */
  currentPage: number;
  /** Taille de la page */
  pageSize: number;
  /** Nombre total de pages */
  totalPages: number;
}

// ──────────────────────────────────────────────────────────────
// 📊 DTO de statistiques
// ──────────────────────────────────────────────────────────────

/**
 * Statistiques des actes pastoraux (DTO)
 */
export interface PastoralActStatisticsDto {
  /** Nombre total */
  total: number;
  /** Répartition par type */
  byType: Record<PastoralActType, number>;
  /** Répartition par mois */
  byMonth: Record<string, number>;
  /** Certificats générés */
  certificatesGenerated: number;
  /** Actes récents */
  recentActs: PastoralActListItem[];
  /** Par officiant */
  byOfficiant: Record<string, number>;
}

// ──────────────────────────────────────────────────────────────
// 🛠️ VALEURS PAR DÉFAUT
// ──────────────────────────────────────────────────────────────

/**
 * Filtre par défaut pour les actes pastoraux
 */
export const DEFAULT_PASTORAL_ACT_FILTER: PastoralActFilterDto = {
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
};

/**
 * DTO de création par défaut
 */
export const DEFAULT_PASTORAL_ACT_CREATE: Partial<PastoralActCreateDto> = {
  type: PastoralActType.Other,
  date: new Date(),
  location: null,
  participants: [],
  witnesses: [],
  details: null,
  notes: null
};

// ──────────────────────────────────────────────────────────────
// 🛠️ CLASSES UTILITAIRES DTO
// ──────────────────────────────────────────────────────────────

/**
 * Utilitaires pour la conversion des DTOs
 */
export class PastoralActDtoUtils {
  /**
   * Convertit une réponse en modèle PastoralAct
   */
  static toModel(response: PastoralActResponseDto): PastoralAct {
    return {
      id: response.id,
      type: response.type,
      date: typeof response.date === 'string' ? new Date(response.date) : response.date,
      location: response.location,
      officiantId: response.officiantId,
      officiantName: response.officiantName,
      participants: response.participants,
      witnesses: response.witnesses,
      certificateNumber: response.certificateNumber,
      certificateGenerated: response.certificateGenerated,
      certificateUrl: response.certificateUrl,
      details: response.details,
      churchId: response.churchId,
      siteId: response.siteId,
      notes: response.notes,
      createdAt: typeof response.createdAt === 'string' ? new Date(response.createdAt) : response.createdAt,
      updatedAt: response.updatedAt ? (typeof response.updatedAt === 'string' ? new Date(response.updatedAt) : response.updatedAt) : null,
      createdBy: response.createdBy
    };
  }

  /**
   * Convertit une liste de réponses en modèles
   */
  static toModelList(responses: PastoralActResponseDto[]): PastoralAct[] {
    return responses.map(r => this.toModel(r));
  }

  /**
   * Convertit un modèle en DTO de création
   */
  static toCreateDto(act: Partial<PastoralAct>): PastoralActCreateDto {
    return {
      type: act.type || PastoralActType.Other,
      date: act.date || new Date(),
      location: act.location || null,
      officiantId: act.officiantId || '',
      participants: (act.participants || []).map(p => ({
        memberId: p.memberId || null,
        firstName: p.firstName,
        lastName: p.lastName,
        role: p.role,
        dateOfBirth: p.dateOfBirth || null
      })),
      witnesses: act.witnesses || [],
      details: act.details ? {
        marriageRegime: act.details.marriageRegime,
        dateOfDeath: act.details.dateOfDeath,
        burialLocation: act.details.burialLocation,
        bibleVerse: act.details.bibleVerse,
        godparents: act.details.godparents
      } : null,
      churchId: act.churchId || '',
      siteId: act.siteId || null,
      notes: act.notes || null
    };
  }

  /**
   * Convertit un modèle en DTO de mise à jour
   */
  static toUpdateDto(act: Partial<PastoralAct>): PastoralActUpdateDto {
    return {
      date: act.date || null,
      location: act.location || null,
      officiantId: act.officiantId || null,
      participants: act.participants ? act.participants.map(p => ({
        memberId: p.memberId || null,
        firstName: p.firstName,
        lastName: p.lastName,
        role: p.role,
        dateOfBirth: p.dateOfBirth || null
      })) : null,
      witnesses: act.witnesses || null,
      details: act.details ? {
        marriageRegime: act.details.marriageRegime,
        dateOfDeath: act.details.dateOfDeath,
        burialLocation: act.details.burialLocation,
        bibleVerse: act.details.bibleVerse,
        godparents: act.details.godparents
      } : null,
      siteId: act.siteId || null,
      notes: act.notes || null
    };
  }

  /**
   * Convertit un participant DTO en participant modèle
   */
  static participantToModel(dto: PastoralActParticipant): PastoralActParticipant {
    return {
      memberId: dto.memberId || null,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      dateOfBirth: dto.dateOfBirth || null
    };
  }

  /**
   * Convertit un participant modèle en DTO de création
   */
  static participantToCreate(dto: PastoralActParticipant): PastoralActParticipantCreate {
    return {
      memberId: dto.memberId || null,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      dateOfBirth: dto.dateOfBirth || null
    };
  }
}
