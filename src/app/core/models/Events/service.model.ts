
export enum ServiceStatus {
  Scheduled = 'Scheduled',
  Prepared = 'Prepared',
  Ongoing = 'Ongoing',
  Completed = 'Completed',
  Cancelled = 'Cancelled'
}

export interface TeamMember {
  memberId: string;
  memberName: string;
  role: string;
  confirmed: boolean;
}

export interface ServiceTeam {
  worship: TeamMember[];
  sound: TeamMember[];
  lighting: TeamMember[];
  welcome: TeamMember[];
  ushers: TeamMember[];
  children: TeamMember[];
  media: TeamMember[];
  other: TeamMember[];
}

export interface ServiceAttendance {
  members: number;
  visitors: number;
  children: number;
  total: number;
  visitorNames: string[];
}

export interface Song {
  id: string;
  title: string;
  artist?: string;
  key?: string;
  tempo?: number;
}

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
  worshipLeaderId?: string;
  worshipLeaderName?: string;
  team: ServiceTeam;
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
  totalTeamMembers: number;
  confirmedTeamMembers: number;
}

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
  worshipLeaderId?: string;
  team?: ServiceTeam;
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
  worshipLeaderId?: string;
  team?: ServiceTeam;
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
  minMembers?: number;
  maxMembers?: number;
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

// Labels pour les statuts
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

// Types de rôles dans l'équipe
export const TEAM_ROLES = {
  Worship: 'worship',
  Sound: 'sound',
  Lighting: 'lighting',
  Welcome: 'welcome',
  Ushers: 'ushers',
  Children: 'children',
  Media: 'media',
  Other: 'other'
};

export const TEAM_ROLE_LABELS: Record<string, string> = {
  [TEAM_ROLES.Worship]: 'Louange',
  [TEAM_ROLES.Sound]: 'Sonorisation',
  [TEAM_ROLES.Lighting]: 'Lumière',
  [TEAM_ROLES.Welcome]: 'Accueil',
  [TEAM_ROLES.Ushers]: 'Huissiers',
  [TEAM_ROLES.Children]: 'Enfants',
  [TEAM_ROLES.Media]: 'Médias',
  [TEAM_ROLES.Other]: 'Autre'
};

// Classe utilitaire pour les cultes
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

  static getTeamRoleLabel(role: string): string {
    return TEAM_ROLE_LABELS[role] || role;
  }

  static getTotalTeamMembers(team: ServiceTeam): number {
    return team.worship.length +
      team.sound.length +
      team.lighting.length +
      team.welcome.length +
      team.ushers.length +
      team.children.length +
      team.media.length +
      team.other.length;
  }

  static getConfirmedTeamMembers(team: ServiceTeam): number {
    const allMembers = [
      ...team.worship,
      ...team.sound,
      ...team.lighting,
      ...team.welcome,
      ...team.ushers,
      ...team.children,
      ...team.media,
      ...team.other
    ];
    return allMembers.filter(m => m.confirmed).length;
  }

  static getConfirmationRate(team: ServiceTeam): number {
    const total = this.getTotalTeamMembers(team);
    if (total === 0) return 0;
    const confirmed = this.getConfirmedTeamMembers(team);
    return Math.round((confirmed / total) * 100);
  }

  static getConfirmationRateColor(rate: number): string {
    if (rate >= 80) return 'success';
    if (rate >= 50) return 'warning';
    return 'danger';
  }

  static getTotalAttendance(attendance: ServiceAttendance): number {
    return attendance.members + attendance.visitors + attendance.children;
  }

  static getEmptyTeam(): ServiceTeam {
    return {
      worship: [],
      sound: [],
      lighting: [],
      welcome: [],
      ushers: [],
      children: [],
      media: [],
      other: []
    };
  }

  static getEmptyAttendance(): ServiceAttendance {
    return {
      members: 0,
      visitors: 0,
      children: 0,
      total: 0,
      visitorNames: []
    };
  }

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

  static sortByAttendance(services: Service[], ascending: boolean = false): Service[] {
    return [...services].sort((a, b) =>
      ascending ?
        (a.attendance.members - b.attendance.members) :
        (b.attendance.members - a.attendance.members)
    );
  }

  static getUpcomingServices(services: Service[]): Service[] {
    const now = new Date();
    return services.filter(service =>
      new Date(service.date) > now &&
      service.status !== ServiceStatus.Cancelled
    );
  }

  static getServiceStats(services: Service[]): {
    total: number;
    scheduled: number;
    prepared: number;
    ongoing: number;
    completed: number;
    cancelled: number;
    totalMembers: number;
    totalVisitors: number;
    totalChildren: number;
    totalAttendees: number;
    averageMembers: number;
    averageVisitors: number;
    averageChildren: number;
    averageAttendees: number;
  } {
    const scheduled = services.filter(s => s.status === ServiceStatus.Scheduled);
    const prepared = services.filter(s => s.status === ServiceStatus.Prepared);
    const ongoing = services.filter(s => s.status === ServiceStatus.Ongoing);
    const completed = services.filter(s => s.status === ServiceStatus.Completed);
    const cancelled = services.filter(s => s.status === ServiceStatus.Cancelled);

    const totalMembers = services.reduce((sum, s) => sum + s.attendance.members, 0);
    const totalVisitors = services.reduce((sum, s) => sum + s.attendance.visitors, 0);
    const totalChildren = services.reduce((sum, s) => sum + s.attendance.children, 0);
    const totalAttendees = totalMembers + totalVisitors + totalChildren;

    return {
      total: services.length,
      scheduled: scheduled.length,
      prepared: prepared.length,
      ongoing: ongoing.length,
      completed: completed.length,
      cancelled: cancelled.length,
      totalMembers: totalMembers,
      totalVisitors: totalVisitors,
      totalChildren: totalChildren,
      totalAttendees: totalAttendees,
      averageMembers: services.length > 0 ? Math.round(totalMembers / services.length) : 0,
      averageVisitors: services.length > 0 ? Math.round(totalVisitors / services.length) : 0,
      averageChildren: services.length > 0 ? Math.round(totalChildren / services.length) : 0,
      averageAttendees: services.length > 0 ? Math.round(totalAttendees / services.length) : 0
    };
  }
}

export const DEFAULT_SERVICE_FILTER: ServiceFilter = {
  page: 1,
  pageSize: 20,
  sortBy: 'date',
  sortOrder: 'desc'
};
