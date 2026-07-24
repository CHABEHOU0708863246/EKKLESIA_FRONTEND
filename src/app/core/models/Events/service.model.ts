// src/app/core/models/Service/service.model.ts

// ============================================================
// 1. ENUMS
// ============================================================

export enum ServiceStatus {
  Scheduled = 'Scheduled',
  Prepared = 'Prepared',
  Ongoing = 'Ongoing',
  Completed = 'Completed',
  Cancelled = 'Cancelled'
}

// ============================================================
// 2. MODÈLES DE BASE
// ============================================================

export interface Song {
  id: string;
  title: string;
  artist?: string;
  key?: string;
  tempo?: number;
}

// ============================================================
// 3. PRÉSENCES (SERVICE ATTENDANCE)
// ============================================================

export interface ServiceAttendance {
  men: number;
  women: number;
  visitors: number;
  children: number;
  acceptedJesus: number;
  notAcceptedJesus: number;
  observation?: string;
  photoUrl?: string;
  visitorNames: string[];
  totalWithChildren?: number;
  totalWithoutChildren?: number;
}

// ============================================================
// 4. SERVICE COMPLET
// ============================================================

export interface Service {
  id: string;
  title: string;
  date: string;
  churchId: string;
  churchName?: string;
  siteId?: string;
  siteName?: string;
  preacherId?: string;
  preacherName?: string;
  bibleText?: string;
  theme?: string;
  songIds: string[];
  songs: Song[];
  // ✅ Champs supprimés : worshipLeaderId, worshipLeaderName, team
  attendance: ServiceAttendance;
  offeringIds: string[];
  status: ServiceStatus;
  statusLabel: string;
  statusColor: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  formattedDate: string;
}

// ============================================================
// 5. DTOS POUR LES REQUÊTES/RÉPONSES
// ============================================================

export interface ServiceCreate {
  title: string;
  date: string;
  churchId: string;
  siteId?: string;
  preacherId?: string;
  preacherName?: string;
  bibleText?: string;
  theme?: string;
  songIds?: string[];
  attendance?: ServiceAttendance;
  status?: ServiceStatus;
  notes?: string;
}

export interface ServiceUpdate {
  title?: string;
  date?: string;
  siteId?: string;
  preacherId?: string;
  preacherName?: string;
  bibleText?: string;
  theme?: string;
  songIds?: string[];
  attendance?: ServiceAttendance;
  status?: ServiceStatus;
  notes?: string;
}

export interface ServiceFilter {
  title?: string;
  preacherId?: string;
  preacherName?: string;
  bibleText?: string;
  theme?: string;
  status?: ServiceStatus;
  churchId?: string;
  siteId?: string;
  dateFrom?: string;
  dateTo?: string;
  createdFrom?: string;
  createdTo?: string;
  minVisitors?: number;
  maxVisitors?: number;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface ServiceListResponse {
  items: Service[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface UploadPhotoResponse {
  success: boolean;
  photoId: string;
  message: string;
}

// ============================================================
// 6. LABELS ET CONSTANTES
// ============================================================

export const ServiceStatusLabels: Record<ServiceStatus, string> = {
  [ServiceStatus.Scheduled]: 'Planifié',
  [ServiceStatus.Prepared]: 'Préparé',
  [ServiceStatus.Ongoing]: 'En cours',
  [ServiceStatus.Completed]: 'Terminé',
  [ServiceStatus.Cancelled]: 'Annulé'
};

export const ServiceStatusColors: Record<ServiceStatus, string> = {
  [ServiceStatus.Scheduled]: 'primary',
  [ServiceStatus.Prepared]: 'info',
  [ServiceStatus.Ongoing]: 'success',
  [ServiceStatus.Completed]: 'secondary',
  [ServiceStatus.Cancelled]: 'danger'
};

// ============================================================
// 7. CLASSE UTILITAIRE
// ============================================================

export class ServiceUtils {
  static getStatusLabel(status: ServiceStatus): string {
    return ServiceStatusLabels[status] || status;
  }

  static getStatusColor(status: ServiceStatus): string {
    return ServiceStatusColors[status] || 'secondary';
  }

  static getFormattedDate(date: string): string {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // ─── Présences ─────────────────────────────────────────────

  static getTotalAttendance(attendance: ServiceAttendance): number {
    return attendance.men + attendance.women + attendance.visitors + attendance.children;
  }

  static getTotalWithChildren(attendance: ServiceAttendance): number {
    return attendance.totalWithChildren ?? this.getTotalAttendance(attendance);
  }

  static getTotalWithoutChildren(attendance: ServiceAttendance): number {
    return attendance.totalWithoutChildren ?? (attendance.men + attendance.women + attendance.visitors);
  }

  static getEmptyAttendance(): ServiceAttendance {
    return {
      men: 0,
      women: 0,
      visitors: 0,
      children: 0,
      acceptedJesus: 0,
      notAcceptedJesus: 0,
      observation: '',
      photoUrl: '',
      visitorNames: [],
      totalWithChildren: 0,
      totalWithoutChildren: 0
    };
  }

  // ─── Recherche et filtres ──────────────────────────────────

  static searchServices(services: Service[], searchTerm: string): Service[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return services;

    return services.filter(service =>
      service.title.toLowerCase().includes(term) ||
      (service.preacherName && service.preacherName.toLowerCase().includes(term)) ||
      (service.bibleText && service.bibleText.toLowerCase().includes(term)) ||
      (service.theme && service.theme.toLowerCase().includes(term))
    );
  }

  static filterByStatus(services: Service[], status: ServiceStatus): Service[] {
    if (!status) return services;
    return services.filter(service => service.status === status);
  }

  static filterByPreacher(services: Service[], preacherId: string): Service[] {
    if (!preacherId) return services;
    return services.filter(service => service.preacherId === preacherId);
  }

  static sortByDate(services: Service[], ascending: boolean = false): Service[] {
    return [...services].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return ascending ? dateA - dateB : dateB - dateA;
    });
  }

  static getUpcomingServices(services: Service[]): Service[] {
    const now = new Date();
    return services.filter(service =>
      new Date(service.date) > now &&
      service.status !== ServiceStatus.Cancelled
    );
  }

  // ─── Statistiques ──────────────────────────────────────────

  static getServiceStats(services: Service[]): {
    total: number;
    scheduled: number;
    prepared: number;
    ongoing: number;
    completed: number;
    cancelled: number;
    totalMen: number;
    totalWomen: number;
    totalVisitors: number;
    totalChildren: number;
    totalAcceptedJesus: number;
    totalNotAcceptedJesus: number;
    totalAttendees: number;
    averageMen: number;
    averageWomen: number;
    averageVisitors: number;
    averageChildren: number;
    averageAttendees: number;
  } {
    const scheduled = services.filter(s => s.status === ServiceStatus.Scheduled);
    const prepared = services.filter(s => s.status === ServiceStatus.Prepared);
    const ongoing = services.filter(s => s.status === ServiceStatus.Ongoing);
    const completed = services.filter(s => s.status === ServiceStatus.Completed);
    const cancelled = services.filter(s => s.status === ServiceStatus.Cancelled);

    const totalMen = services.reduce((sum, s) => sum + (s.attendance.men || 0), 0);
    const totalWomen = services.reduce((sum, s) => sum + (s.attendance.women || 0), 0);
    const totalVisitors = services.reduce((sum, s) => sum + (s.attendance.visitors || 0), 0);
    const totalChildren = services.reduce((sum, s) => sum + (s.attendance.children || 0), 0);
    const totalAcceptedJesus = services.reduce((sum, s) => sum + (s.attendance.acceptedJesus || 0), 0);
    const totalNotAcceptedJesus = services.reduce((sum, s) => sum + (s.attendance.notAcceptedJesus || 0), 0);
    const totalAttendees = totalMen + totalWomen + totalVisitors + totalChildren;

    const count = services.length;

    return {
      total: count,
      scheduled: scheduled.length,
      prepared: prepared.length,
      ongoing: ongoing.length,
      completed: completed.length,
      cancelled: cancelled.length,
      totalMen,
      totalWomen,
      totalVisitors,
      totalChildren,
      totalAcceptedJesus,
      totalNotAcceptedJesus,
      totalAttendees,
      averageMen: count > 0 ? Math.round(totalMen / count) : 0,
      averageWomen: count > 0 ? Math.round(totalWomen / count) : 0,
      averageVisitors: count > 0 ? Math.round(totalVisitors / count) : 0,
      averageChildren: count > 0 ? Math.round(totalChildren / count) : 0,
      averageAttendees: count > 0 ? Math.round(totalAttendees / count) : 0,
    };
  }
}

// ============================================================
// 8. DEFAUTS
// ============================================================

export const DEFAULT_SERVICE_FILTER: ServiceFilter = {
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
};
