import { Address, Member } from './member.model';

export interface CellGroup {
  id: string;
  name: string;
  leaderId: string;
  leaderName: string;
  assistantLeaderId?: string;
  assistantLeaderName?: string;
  location?: string;
  address?: Address;
  meetingDay?: string;
  meetingTime?: string;
  formattedMeetingTime?: string;
  memberIds: string[];
  members: Member[];
  memberCount: number;
  churchId: string;
  churchName?: string;
  siteId?: string;
  siteName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CellGroupCreate {
  name: string;
  leaderId: string;
  assistantLeaderId?: string;
  location?: string;
  address?: Address;
  meetingDay?: string;
  meetingTime?: string;
  memberIds?: string[];
  churchId: string;
  siteId?: string;
  isActive?: boolean;
}

export interface CellGroupUpdate {
  name?: string;
  leaderId?: string;
  assistantLeaderId?: string;
  location?: string;
  address?: Address;
  meetingDay?: string;
  meetingTime?: string;
  memberIds?: string[];
  siteId?: string;
  isActive?: boolean;
}

export interface CellGroupFilter {
  name?: string;
  leaderId?: string;
  assistantLeaderId?: string;
  location?: string;
  meetingDay?: string;
  churchId?: string;
  siteId?: string;
  isActive?: boolean;
  minMemberCount?: number;
  maxMemberCount?: number;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface CellGroupListResponse {
  items: CellGroup[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// Jours de la semaine
export const WEEK_DAYS = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche'
];

// Classe utilitaire
export class CellGroupUtils {
  static getFormattedMeetingTime(time?: string): string {
    if (!time) return 'Non défini';
    const parts = time.split(':');
    if (parts.length < 2) return time;
    return `${parts[0]}h${parts[1]}`;
  }

  static getStatusBadge(isActive: boolean): { label: string; color: string } {
    return isActive
      ? { label: 'Actif', color: 'success' }
      : { label: 'Inactif', color: 'danger' };
  }

  static getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  static searchCellGroups(groups: CellGroup[], searchTerm: string): CellGroup[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return groups;

    return groups.filter(group =>
      group.name.toLowerCase().includes(term) ||
      (group.location && group.location.toLowerCase().includes(term)) ||
      (group.leaderName && group.leaderName.toLowerCase().includes(term))
    );
  }

  static getMeetingDayLabel(day?: string): string {
    if (!day) return 'Non défini';
    const found = WEEK_DAYS.find(d => d.toLowerCase() === day.toLowerCase());
    return found || day;
  }

  static sortByMemberCount(groups: CellGroup[]): CellGroup[] {
    return [...groups].sort((a, b) => b.memberCount - a.memberCount);
  }
}

export const DEFAULT_CELL_GROUP_FILTER: CellGroupFilter = {
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
};
