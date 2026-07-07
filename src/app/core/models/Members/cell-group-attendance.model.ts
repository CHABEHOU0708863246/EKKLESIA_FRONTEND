import { Member } from './member.model';

export interface CellGroupAttendance {
  id: string;
  cellGroupId: string;
  cellGroupName: string;
  date: string;
  presentMembers: Member[];
  absentMembers: Member[];
  presentCount: number;
  absentCount: number;
  visitorCount: number;
  totalAttendees: number;
  report?: string;
  prayerRequests: string[];
  createdAt: string;
  createdBy: string;
  createdByName: string;
  formattedDate: string;
  formattedCreatedAt: string;
  attendanceRate: number;
}

export interface CellGroupAttendanceCreate {
  cellGroupId: string;
  date: string;
  presentMemberIds: string[];
  absentMemberIds: string[];
  visitorCount?: number;
  report?: string;
  prayerRequests?: string[];
}

export interface CellGroupAttendanceUpdate {
  presentMemberIds?: string[];
  absentMemberIds?: string[];
  visitorCount?: number;
  report?: string;
  prayerRequests?: string[];
}

export interface CellGroupAttendanceFilter {
  cellGroupId?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface CellGroupAttendanceListResponse {
  items: CellGroupAttendance[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// Classe utilitaire
export class CellGroupAttendanceUtils {
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

  static getAttendanceRateColor(rate: number): string {
    if (rate >= 80) return 'success';
    if (rate >= 50) return 'warning';
    return 'danger';
  }

  static getAttendanceRateLabel(rate: number): string {
    if (rate >= 80) return 'Excellent';
    if (rate >= 50) return 'Bon';
    return 'À améliorer';
  }

  static getTotalMembers(attendance: CellGroupAttendance): number {
    return attendance.presentCount + attendance.absentCount;
  }

  static getMemberNames(members: Member[]): string {
    return members.map(m => m.fullName).join(', ');
  }
}

export const DEFAULT_ATTENDANCE_FILTER: CellGroupAttendanceFilter = {
  page: 1,
  pageSize: 20,
  sortBy: 'date',
  sortOrder: 'desc'
};
