
export interface PastoralNote {
  id: string;
  memberId: string;
  memberName: string;
  pastorId: string;
  pastorName: string;
  interactionType: string;
  interactionTypeLabel: string;
  date: string;
  summary: string;
  prayerRequests: string[];
  followUpDate?: string;
  isConfidential: boolean;
  createdAt: string;
  updatedAt?: string;
  formattedDate: string;
  formattedFollowUpDate: string;
}

export interface PastoralNoteCreate {
  memberId: string;
  pastorId: string;
  interactionType: string;
  date: string;
  summary: string;
  prayerRequests?: string[];
  followUpDate?: string;
  isConfidential?: boolean;
}

export interface PastoralNoteUpdate {
  interactionType?: string;
  date?: string;
  summary?: string;
  prayerRequests?: string[];
  followUpDate?: string;
  isConfidential?: boolean;
}

export interface PastoralNoteFilter {
  memberId?: string;
  pastorId?: string;
  interactionType?: string;
  dateFrom?: string;
  dateTo?: string;
  followUpFrom?: string;
  followUpTo?: string;
  isConfidential?: boolean;
  hasFollowUp?: boolean;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface PastoralNoteListResponse {
  items: PastoralNote[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// Interaction types
export const INTERACTION_TYPES = [
  { value: 'Visite', label: 'Visite à domicile' },
  { value: 'Appel', label: 'Appel téléphonique' },
  { value: 'Entretien', label: 'Entretien pastoral' },
  { value: 'Visite_Hopital', label: 'Visite à l\'hôpital' },
  { value: 'Priere', label: 'Séance de prière' },
  { value: 'Autre', label: 'Autre' }
];

export const INTERACTION_TYPE_COLORS: Record<string, string> = {
  'Visite': 'primary',
  'Appel': 'info',
  'Entretien': 'warning',
  'Visite_Hopital': 'danger',
  'Priere': 'success',
  'Autre': 'secondary'
};

// Classe utilitaire
export class PastoralNoteUtils {
  static getFormattedDate(date: string): string {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static getFormattedDateOnly(date?: string): string {
    if (!date) return 'Aucun suivi prévu';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  static getInteractionTypeLabel(type: string): string {
    const found = INTERACTION_TYPES.find(t => t.value === type);
    return found?.label || type;
  }

  static getInteractionTypeColor(type: string): string {
    return INTERACTION_TYPE_COLORS[type] || 'secondary';
  }

  static getIsFollowUpNeeded(note: PastoralNote): boolean {
    if (!note.followUpDate) return false;
    const followUp = new Date(note.followUpDate);
    const today = new Date();
    return followUp <= today;
  }

  static getFollowUpStatus(note: PastoralNote): { label: string; color: string } {
    if (!note.followUpDate) {
      return { label: 'Aucun suivi', color: 'secondary' };
    }
    const followUp = new Date(note.followUpDate);
    const today = new Date();
    if (followUp < today) {
      return { label: 'En retard', color: 'danger' };
    }
    const daysDiff = Math.ceil((followUp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 3) {
      return { label: 'Très bientôt', color: 'warning' };
    }
    return { label: 'Planifié', color: 'success' };
  }

  static searchNotes(notes: PastoralNote[], searchTerm: string): PastoralNote[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return notes;

    return notes.filter(note =>
      note.memberName.toLowerCase().includes(term) ||
      note.pastorName.toLowerCase().includes(term) ||
      note.summary.toLowerCase().includes(term) ||
      note.interactionType.toLowerCase().includes(term)
    );
  }
}

export const DEFAULT_PASTORAL_NOTE_FILTER: PastoralNoteFilter = {
  page: 1,
  pageSize: 20,
  sortBy: 'date',
  sortOrder: 'desc'
};
