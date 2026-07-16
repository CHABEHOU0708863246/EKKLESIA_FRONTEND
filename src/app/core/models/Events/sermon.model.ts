export enum SermonStatus {
  Draft = 'Draft',
  Published = 'Published',
  Archived = 'Archived',
}

export enum SermonMediaType {
  Audio = 'Audio',
  Document = 'Document',
  Video = 'Video',
  Link = 'Link',
}

export interface SermonMedia {
  id: string;
  type: SermonMediaType;
  label?: string;
  fileId?: string;
  externalUrl?: string;
  durationSeconds?: number;
  uploadedAt: string;
}

export interface Sermon {
  id: string;
  title: string;
  preacherId?: string;
  preacherName: string;
  date: string;
  formattedDate: string;
  serviceId?: string;
  churchId: string;
  churchName?: string;
  siteId?: string;
  siteName?: string;
  theme?: string;
  bibleText?: string;
  summary?: string;
  series?: string;
  seriesOrder?: number;
  media: SermonMedia[];
  tags: string[];
  status: SermonStatus;
  statusLabel: string;
  statusColor: string;
  publishedAt?: string;
  viewCount: number;
  downloadCount: number;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  // ✅ Propriétés de réponse (DTO à plat, cf. pattern du reste du backend)
  isSuccess?: boolean;
  errorMessage?: string;
}

export interface SermonCreate {
  title: string;
  preacherId?: string;
  preacherName: string;
  date: string;
  serviceId?: string;
  churchId: string;
  siteId?: string;
  theme?: string;
  bibleText?: string;
  summary?: string;
  series?: string;
  seriesOrder?: number;
  tags?: string[];
  status?: SermonStatus;
  userId?: string;
}

export interface SermonUpdate {
  title?: string;
  preacherId?: string;
  preacherName?: string;
  date?: string;
  serviceId?: string;
  siteId?: string;
  theme?: string;
  bibleText?: string;
  summary?: string;
  series?: string;
  seriesOrder?: number;
  tags?: string[];
}

/** Payload d'ajout de média — envoyé en multipart/form-data si File présent */
export interface SermonAddMedia {
  type: SermonMediaType;
  label?: string;
  externalUrl?: string;
  file?: File;
  durationSeconds?: number;
}

export interface SermonFilter {
  title?: string;
  preacherId?: string;
  preacherName?: string;
  theme?: string;
  series?: string;
  tag?: string;
  status?: SermonStatus;
  churchId?: string;
  siteId?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface SermonListResponse {
  items: Sermon[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export const DEFAULT_SERMON_FILTER: SermonFilter = {
  page: 1,
  pageSize: 12,
  sortBy: 'Date',
  sortOrder: 'desc',
};

// ── Labels & couleurs ──

export const SermonStatusLabels: Record<SermonStatus, string> = {
  [SermonStatus.Draft]: 'Brouillon',
  [SermonStatus.Published]: 'Publié',
  [SermonStatus.Archived]: 'Archivé',
};

export const SermonStatusColors: Record<SermonStatus, string> = {
  [SermonStatus.Draft]: 'secondary',
  [SermonStatus.Published]: 'success',
  [SermonStatus.Archived]: 'warning',
};

export const SermonMediaTypeLabels: Record<SermonMediaType, string> = {
  [SermonMediaType.Audio]: 'Audio',
  [SermonMediaType.Document]: 'Document',
  [SermonMediaType.Video]: 'Vidéo',
  [SermonMediaType.Link]: 'Lien',
};

export const SermonMediaTypeIcons: Record<SermonMediaType, string> = {
  [SermonMediaType.Audio]: 'bx-headphone',
  [SermonMediaType.Document]: 'bx-file',
  [SermonMediaType.Video]: 'bx-video',
  [SermonMediaType.Link]: 'bx-link',
};

export class SermonUtils {
  static getStatusLabel(status: SermonStatus): string {
    return SermonStatusLabels[status] || status;
  }

  static getStatusColor(status: SermonStatus): string {
    return SermonStatusColors[status] || 'secondary';
  }

  static getMediaTypeLabel(type: SermonMediaType): string {
    return SermonMediaTypeLabels[type] || type;
  }

  static getMediaTypeIcon(type: SermonMediaType): string {
    return SermonMediaTypeIcons[type] || 'bx-file';
  }

  static getFormattedDate(date: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  static getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  static getAudioMedia(sermon: Sermon): SermonMedia | undefined {
    return sermon.media.find((m) => m.type === SermonMediaType.Audio);
  }

  static getVideoMedia(sermon: Sermon): SermonMedia | undefined {
    return sermon.media.find((m) => m.type === SermonMediaType.Video);
  }

  static getDocumentMedia(sermon: Sermon): SermonMedia[] {
    return sermon.media.filter((m) => m.type === SermonMediaType.Document);
  }

  static hasMedia(sermon: Sermon): boolean {
    return sermon.media.length > 0;
  }

  static canPublish(sermon: Sermon): boolean {
    return sermon.status === SermonStatus.Draft && sermon.media.length > 0;
  }

  static formatDuration(seconds?: number): string {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
