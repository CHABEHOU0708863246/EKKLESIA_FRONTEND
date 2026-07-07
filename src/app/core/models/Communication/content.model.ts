
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

export interface ContentMetadata {
  speaker?: string;
  bibleVerse?: string;
  eventDate?: string;
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
  duration?: number;
  formattedDuration?: string;
  size?: number;
  formattedSize?: string;
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
  sortOrder?: string;
}

export interface ContentListResponse {
  items: Content[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

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

export interface ContentPublish {
  isPublished: boolean;
  publishedAt?: string;
  isFeatured?: boolean;
}

export interface ContentBulkAction {
  contentIds: string[];
  action: 'Publish' | 'Unpublish' | 'Delete' | 'Feature' | 'Unfeature';
  isPublished?: boolean;
  isFeatured?: boolean;
}

// Labels et couleurs pour les types de contenu
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
  [ContentType.Audio]: 'success',
  [ContentType.Image]: 'info',
  [ContentType.Document]: 'warning',
  [ContentType.Article]: 'secondary',
  [ContentType.Song]: 'purple',
  [ContentType.Announcement]: 'orange',
  [ContentType.Other]: 'gray'
};

// Classe utilitaire
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

  static getStatusBadge(isPublished: boolean): { label: string; color: string } {
    return isPublished
      ? { label: 'Publié', color: 'success' }
      : { label: 'Brouillon', color: 'warning' };
  }

  static getFeaturedBadge(isFeatured: boolean): { label: string; color: string } {
    return isFeatured
      ? { label: 'À la une', color: 'primary' }
      : { label: 'Normal', color: 'secondary' };
  }

  static formatDuration(seconds?: number): string {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h${minutes.toString().padStart(2, '0')}`;
    }
    return `${minutes}m${secs.toString().padStart(2, '0')}`;
  }

  static formatFileSize(bytes?: number): string {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    let len = bytes;
    let order = 0;
    while (len >= 1024 && order < sizes.length - 1) {
      order++;
      len = len / 1024;
    }
    return `${len.toFixed(2)} ${sizes[order]}`;
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

  static getInitials(title: string): string {
    return title
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  static searchContents(contents: Content[], searchTerm: string): Content[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return contents;

    return contents.filter(content =>
      content.title.toLowerCase().includes(term) ||
      (content.description && content.description.toLowerCase().includes(term)) ||
      (content.metadata?.speaker && content.metadata.speaker.toLowerCase().includes(term)) ||
      (content.metadata?.bibleVerse && content.metadata.bibleVerse.toLowerCase().includes(term)) ||
      content.tags.some(tag => tag.toLowerCase().includes(term))
    );
  }

  static filterByType(contents: Content[], type: ContentType): Content[] {
    if (!type) return contents;
    return contents.filter(content => content.type === type);
  }

  static filterByTag(contents: Content[], tag: string): Content[] {
    if (!tag) return contents;
    return contents.filter(content =>
      content.tags.some(t => t.toLowerCase() === tag.toLowerCase())
    );
  }

  static filterBySpeaker(contents: Content[], speaker: string): Content[] {
    if (!speaker) return contents;
    return contents.filter(content =>
      content.metadata?.speaker?.toLowerCase() === speaker.toLowerCase()
    );
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

  static sortByDate(contents: Content[], ascending: boolean = false): Content[] {
    return [...contents].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return ascending ? dateA - dateB : dateB - dateA;
    });
  }

  static getSpeakers(contents: Content[]): string[] {
    const speakers = new Set<string>();
    contents.forEach(content => {
      if (content.metadata?.speaker) {
        speakers.add(content.metadata.speaker);
      }
    });
    return Array.from(speakers);
  }

  static getTags(contents: Content[]): string[] {
    const tags = new Set<string>();
    contents.forEach(content => {
      content.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }

  static getSeries(contents: Content[]): string[] {
    const series = new Set<string>();
    contents.forEach(content => {
      if (content.metadata?.series) {
        series.add(content.metadata.series);
      }
    });
    return Array.from(series);
  }
}

export const DEFAULT_CONTENT_FILTER: ContentFilter = {
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
};
