
export interface UnavailablePeriod {
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface VolunteerAvailability {
  days: string[];
  preferredTime?: string;
  weeklyHours?: number;
  startDate?: string;
  endDate?: string;
  unavailablePeriods: UnavailablePeriod[];
}

export interface Volunteer {
  id: string;
  memberId: string;
  memberFullName: string;
  memberPhone: string;
  memberEmail: string;
  ministryId: string;
  ministryName: string;
  role: string;
  skills: string[];
  availability: VolunteerAvailability;
  serviceHours: number;
  servicesCount: number;
  lastService?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  formattedLastService: string;
  averageHoursPerService: number;
  availabilitySummary: string;
}

export interface VolunteerCreate {
  memberId: string;
  ministryId: string;
  role: string;
  skills?: string[];
  availability?: VolunteerAvailability;
  serviceHours?: number;
  servicesCount?: number;
  lastService?: string;
  isActive?: boolean;
  notes?: string;
}

export interface VolunteerUpdate {
  ministryId?: string;
  role?: string;
  skills?: string[];
  availability?: VolunteerAvailability;
  serviceHours?: number;
  servicesCount?: number;
  lastService?: string;
  isActive?: boolean;
  notes?: string;
}

export interface VolunteerFilter {
  memberId?: string;
  ministryId?: string;
  role?: string;
  skill?: string;
  isActive?: boolean;
  preferredDay?: string;
  preferredTime?: string;
  minServiceHours?: number;
  maxServiceHours?: number;
  minServicesCount?: number;
  maxServicesCount?: number;
  lastServiceFrom?: string;
  lastServiceTo?: string;
  availabilityStartDate?: string;
  availabilityEndDate?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface VolunteerListResponse {
  items: Volunteer[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface VolunteerSummary {
  totalVolunteers: number;
  activeVolunteers: number;
  inactiveVolunteers: number;
  volunteersByMinistry: Record<string, number>;
  volunteersByRole: Record<string, number>;
  totalServiceHours: number;
  totalServicesCount: number;
  averageHoursPerVolunteer: number;
  averageServicesPerVolunteer: number;
  topVolunteers: Volunteer[];
  recentlyAddedVolunteers: Volunteer[];
  inactiveVolunteersList: Volunteer[];
}

// Jours de la semaine (en anglais pour la BD)
export const WEEK_DAYS_EN = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export const WEEK_DAYS_FR: Record<string, string> = {
  'Monday': 'Lundi',
  'Tuesday': 'Mardi',
  'Wednesday': 'Mercredi',
  'Thursday': 'Jeudi',
  'Friday': 'Vendredi',
  'Saturday': 'Samedi',
  'Sunday': 'Dimanche'
};

export const PREFERRED_TIMES = [
  { value: 'Morning', label: 'Matin' },
  { value: 'Afternoon', label: 'Après-midi' },
  { value: 'Evening', label: 'Soir' }
];

// Classe utilitaire
export class VolunteerUtils {
  static getDayLabel(day: string): string {
    return WEEK_DAYS_FR[day] || day;
  }

  static getDaysLabels(days: string[]): string[] {
    return days.map(d => this.getDayLabel(d));
  }

  static getFormattedDays(days: string[]): string {
    if (!days || days.length === 0) return 'Non disponible';
    return this.getDaysLabels(days).join(', ');
  }

  static getPreferredTimeLabel(time?: string): string {
    const found = PREFERRED_TIMES.find(t => t.value === time);
    return found?.label || time || 'Non spécifié';
  }

  static getStatusBadge(isActive: boolean): { label: string; color: string } {
    return isActive
      ? { label: 'Actif', color: 'success' }
      : { label: 'Inactif', color: 'danger' };
  }

  static getFormattedDate(date?: string): string {
    if (!date) return 'Jamais';
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

  static getAvailabilitySummary(availability: VolunteerAvailability): string {
    if (!availability.days || availability.days.length === 0) {
      return 'Non disponible';
    }
    const days = this.getFormattedDays(availability.days);
    const time = this.getPreferredTimeLabel(availability.preferredTime);
    return `${days} - ${time}`;
  }

  static getServiceLevel(volunteer: Volunteer): { label: string; color: string } {
    const hours = volunteer.serviceHours;
    if (hours >= 100) return { label: 'Excellent', color: 'success' };
    if (hours >= 50) return { label: 'Bon', color: 'info' };
    if (hours >= 20) return { label: 'Moyen', color: 'warning' };
    return { label: 'Débutant', color: 'secondary' };
  }

  static searchVolunteers(volunteers: Volunteer[], searchTerm: string): Volunteer[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return volunteers;

    return volunteers.filter(vol =>
      vol.memberFullName.toLowerCase().includes(term) ||
      vol.role.toLowerCase().includes(term) ||
      vol.ministryName.toLowerCase().includes(term) ||
      vol.skills.some(s => s.toLowerCase().includes(term))
    );
  }

  static filterBySkill(volunteers: Volunteer[], skill: string): Volunteer[] {
    if (!skill) return volunteers;
    return volunteers.filter(vol =>
      vol.skills.some(s => s.toLowerCase() === skill.toLowerCase())
    );
  }

  static filterByAvailability(volunteers: Volunteer[], day: string): Volunteer[] {
    if (!day) return volunteers;
    return volunteers.filter(vol =>
      vol.availability.days.some(d => d.toLowerCase() === day.toLowerCase())
    );
  }

  static sortByServiceHours(volunteers: Volunteer[], ascending: boolean = false): Volunteer[] {
    return [...volunteers].sort((a, b) =>
      ascending ? a.serviceHours - b.serviceHours : b.serviceHours - a.serviceHours
    );
  }
}

export const DEFAULT_VOLUNTEER_FILTER: VolunteerFilter = {
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
};
