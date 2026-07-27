// ============================================================
// 1. ENUMS
// ============================================================

export enum ContentType {
  Sermon = 'Sermon',
  Video = 'Video',
  Audio = 'Audio',
  Image = 'Image',
  Document = 'Document',
  Article = 'Article',
  Song = 'Song',
  Announcement = 'Announcement',
  Other = 'Other'
}

// ============================================================
// 2. MODÈLES DE BASE
// ============================================================

export interface ContentMetadata {
  speaker?: string;
  bibleVerse?: string;
  eventDate?: string;      // ISO date string
  location?: string;
  series?: string;
  language?: string;
  formattedEventDate?: string;
}

export interface Content {
  id: string;
  title: string;
  type: ContentType;
  typeLabel: string;
  typeIcon: string;
  url: string;
  thumbnailUrl?: string;
  description?: string;
  duration?: number;           // en secondes
  formattedDuration?: string;  // ex: "1h30"
  size?: number;               // en bytes
  formattedSize?: string;      // ex: "2.5 MB"
  metadata?: ContentMetadata;
  tags: string[];
  views: number;
  downloads: number;
  churchId: string;
  churchName?: string;
  siteId?: string;
  siteName?: string;
  publishedAt?: string;
  isPublished: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  createdByName?: string;
  formattedCreatedAt: string;
  formattedPublishedAt?: string;
  statusLabel: string;
  statusColor: string;
}

// ============================================================
// 3. DTOS POUR LES REQUÊTES/RÉPONSES
// ============================================================

// 3.1 DTO pour la création d'un contenu
export interface ContentCreate {
  title: string;
  type: ContentType;
  url: string;
  thumbnailUrl?: string;
  description?: string;
  duration?: number;
  size?: number;
  metadata?: ContentMetadata;
  tags?: string[];
  churchId: string;
  siteId?: string;
  publishedAt?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
}

// 3.2 DTO pour la mise à jour d'un contenu
export interface ContentUpdate {
  title?: string;
  type?: ContentType;
  url?: string;
  thumbnailUrl?: string;
  description?: string;
  duration?: number;
  size?: number;
  metadata?: ContentMetadata;
  tags?: string[];
  siteId?: string;
  publishedAt?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
}

// 3.3 DTO pour la publication d'un contenu
export interface ContentPublish {
  isPublished?: boolean;
  publishedAt?: string;
  isFeatured?: boolean;
}

// 3.4 DTO pour le filtre de recherche
export interface ContentFilter {
  title?: string;
  type?: ContentType;
  types?: ContentType[];
  speaker?: string;
  bibleVerse?: string;
  series?: string;
  tag?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  churchId?: string;
  siteId?: string;
  createdBy?: string;
  createdFrom?: string;
  createdTo?: string;
  publishedFrom?: string;
  publishedTo?: string;
  minViews?: number;
  maxViews?: number;
  minDownloads?: number;
  maxDownloads?: number;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 3.5 Réponse paginée
export interface ContentListResponse {
  items: Content[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// 3.6 Résumé des contenus (statistiques)
export interface ContentSummary {
  totalContents: number;
  publishedContents: number;
  draftContents: number;
  featuredContents: number;
  contentsByType: Record<ContentType, number>;
  totalViews: number;
  totalDownloads: number;
  mostViewedContent?: Content;
  mostDownloadedContent?: Content;
  recentContents: Content[];
  contentsBySpeaker: Record<string, number>;
  contentsBySeries: Record<string, number>;
  averageViewsPerContent: number;
  averageDownloadsPerContent: number;
}

// ============================================================
// 4. MAPPINGS (Labels, Icons, Colors)
// ============================================================

export const ContentTypeLabels: Record<ContentType, string> = {
  [ContentType.Sermon]: 'Sermon',
  [ContentType.Video]: 'Vidéo',
  [ContentType.Audio]: 'Audio',
  [ContentType.Image]: 'Image',
  [ContentType.Document]: 'Document',
  [ContentType.Article]: 'Article',
  [ContentType.Song]: 'Chant',
  [ContentType.Announcement]: 'Annonce',
  [ContentType.Other]: 'Autre'
};

export const ContentTypeIcons: Record<ContentType, string> = {
  [ContentType.Sermon]: 'fa-church',
  [ContentType.Video]: 'fa-video',
  [ContentType.Audio]: 'fa-music',
  [ContentType.Image]: 'fa-image',
  [ContentType.Document]: 'fa-file-alt',
  [ContentType.Article]: 'fa-newspaper',
  [ContentType.Song]: 'fa-music',
  [ContentType.Announcement]: 'fa-bullhorn',
  [ContentType.Other]: 'fa-cube'
};

export const ContentTypeColors: Record<ContentType, string> = {
  [ContentType.Sermon]: 'primary',
  [ContentType.Video]: 'danger',
  [ContentType.Audio]: 'info',
  [ContentType.Image]: 'success',
  [ContentType.Document]: 'warning',
  [ContentType.Article]: 'purple',
  [ContentType.Song]: 'teal',
  [ContentType.Announcement]: 'orange',
  [ContentType.Other]: 'secondary'
};

// ============================================================
// 5. CLASSE UTILITAIRE
// ============================================================

export class ContentUtils {


  static getTypeLabel(type: ContentType): string {
    return ContentTypeLabels[type] || type;
  }

  static getTypeIcon(type: ContentType): string {
    return ContentTypeIcons[type] || 'fa-file';
  }

  static getTypeColor(type: ContentType): string {
    return ContentTypeColors[type] || 'secondary';
  }

  static getStatusLabel(isPublished: boolean): string {
    return isPublished ? 'Publié' : 'Brouillon';
  }

  static getStatusColor(isPublished: boolean): string {
    return isPublished ? 'success' : 'warning';
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  static formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '—';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h${minutes > 0 ? minutes.toString().padStart(2, '0') : ''}`;
    }
    if (minutes > 0) {
      return `${minutes}min${secs > 0 ? secs.toString().padStart(2, '0') : ''}`;
    }
    return `${secs}s`;
  }

  static getFormattedDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  static getFormattedDateTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static searchContents(contents: Content[], searchTerm: string): Content[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return contents;

    return contents.filter(c =>
      c.title.toLowerCase().includes(term) ||
      (c.description && c.description.toLowerCase().includes(term)) ||
      (c.metadata?.speaker && c.metadata.speaker.toLowerCase().includes(term)) ||
      (c.metadata?.series && c.metadata.series.toLowerCase().includes(term)) ||
      c.tags.some(t => t.toLowerCase().includes(term))
    );
  }

  static filterByType(contents: Content[], type: ContentType): Content[] {
    if (!type) return contents;
    return contents.filter(c => c.type === type);
  }

  static filterByStatus(contents: Content[], isPublished: boolean): Content[] {
    return contents.filter(c => c.isPublished === isPublished);
  }

  static filterByFeatured(contents: Content[], isFeatured: boolean): Content[] {
    return contents.filter(c => c.isFeatured === isFeatured);
  }

  static sortByDate(contents: Content[], ascending: boolean = false): Content[] {
    return [...contents].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return ascending ? dateA - dateB : dateB - dateA;
    });
  }

  static sortByViews(contents: Content[], ascending: boolean = false): Content[] {
    return [...contents].sort((a, b) =>
      ascending ? a.views - b.views : b.views - a.views
    );
  }

  static sortByDownloads(contents: Content[], ascending: boolean = false): Content[] {
    return [...contents].sort((a, b) =>
      ascending ? a.downloads - b.downloads : b.downloads - a.downloads
    );
  }

  static getMostViewedContent(contents: Content[]): Content | undefined {
    return this.sortByViews(contents, false)[0];
  }

  static getMostDownloadedContent(contents: Content[]): Content | undefined {
    return this.sortByDownloads(contents, false)[0];
  }



  static getContentStats(contents: Content[]): {
    total: number;
    published: number;
    drafts: number;
    featured: number;
    byType: Record<ContentType, number>;
    totalViews: number;
    totalDownloads: number;
    averageViews: number;
    averageDownloads: number;
  } {
    const published = contents.filter(c => c.isPublished);
    const drafts = contents.filter(c => !c.isPublished);
    const featured = contents.filter(c => c.isFeatured);
    const byType: Record<ContentType, number> = {} as any;

    Object.values(ContentType).forEach(t => byType[t] = 0);

    contents.forEach(c => {
      byType[c.type] = (byType[c.type] || 0) + 1;
    });

    const totalViews = contents.reduce((sum, c) => sum + c.views, 0);
    const totalDownloads = contents.reduce((sum, c) => sum + c.downloads, 0);

    return {
      total: contents.length,
      published: published.length,
      drafts: drafts.length,
      featured: featured.length,
      byType,
      totalViews,
      totalDownloads,
      averageViews: contents.length > 0 ? Math.round(totalViews / contents.length) : 0,
      averageDownloads: contents.length > 0 ? Math.round(totalDownloads / contents.length) : 0
    };
  }
}

// ============================================================
// 6. VALEURS PAR DÉFAUT
// ============================================================

export const DEFAULT_CONTENT_FILTER: ContentFilter = {
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
};

export const EMPTY_CONTENT: Content = {
  id: '',
  title: '',
  type: ContentType.Other,
  typeLabel: '',
  typeIcon: '',
  url: '',
  tags: [],
  views: 0,
  downloads: 0,
  churchId: '',
  isPublished: false,
  isFeatured: false,
  createdAt: '',
  createdBy: '',
  formattedCreatedAt: '',
  statusLabel: 'Brouillon',
  statusColor: 'warning'
};



