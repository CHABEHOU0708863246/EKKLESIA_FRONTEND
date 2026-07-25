
// ============================================================
// 1. ENUM
// ============================================================

export enum AppointmentStatus {
  Scheduled = 'Scheduled',   // Planifié
  Confirmed = 'Confirmed',   // Confirmé
  Completed = 'Completed',   // Terminé
  Cancelled = 'Cancelled',   // Annulé
  Rescheduled = 'Rescheduled' // Reporté
}

// ============================================================
// 2. MODÈLE DE BASE
// ============================================================

export interface Appointment {
  id: string;
  pastorId: string;
  pastorName?: string;
  churchId: string;
  churchName?: string;
  siteId?: string;
  siteName?: string;
  memberId?: string;
  memberName?: string;
  visitorName?: string;
  visitorPhone?: string;
  visitorEmail?: string;
  appointmentDate: string;       // ISO date string
  durationMinutes: number;
  location?: string;
  reason: string;
  notes?: string;
  status: AppointmentStatus;
  statusLabel: string;
  statusColor: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  updatedBy?: string;
  // Propriétés calculées
  isUpcoming: boolean;
  isPast: boolean;
  formattedDate: string;
  formattedDuration: string;
  participantName: string;
  participantPhone?: string;
  participantEmail?: string;
  isSuccess?: boolean;
  errorMessage?: string;
}

// ============================================================
// 3. DTOS POUR LES REQUÊTES
// ============================================================

export interface AppointmentCreate {
  pastorId: string;
  churchId: string;
  siteId?: string;
  memberId?: string;
  visitorName?: string;
  visitorPhone?: string;
  visitorEmail?: string;
  appointmentDate: string;      // ISO date string
  durationMinutes?: number;     // défaut: 30
  location?: string;
  reason: string;
  notes?: string;
}

export interface AppointmentUpdate {
  pastorId?: string;
  churchId?: string;
  siteId?: string;
  memberId?: string;
  visitorName?: string;
  visitorPhone?: string;
  visitorEmail?: string;
  appointmentDate?: string;
  durationMinutes?: number;
  location?: string;
  reason?: string;
  notes?: string;
  status?: AppointmentStatus;
}

export interface AppointmentFilter {
  pastorId?: string;
  churchId?: string;
  siteId?: string;
  memberId?: string;
  visitorName?: string;
  status?: AppointmentStatus;
  statuses?: AppointmentStatus[];
  dateFrom?: string;
  dateTo?: string;
  reason?: string;          // recherche partielle
  location?: string;
  isUpcoming?: boolean;     // true = futur, false = passé
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AppointmentListResponse {
  items: Appointment[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// ============================================================
// 4. HELPERS
// ============================================================

export const AppointmentStatusLabels: Record<AppointmentStatus, string> = {
  [AppointmentStatus.Scheduled]: 'Planifié',
  [AppointmentStatus.Confirmed]: 'Confirmé',
  [AppointmentStatus.Completed]: 'Terminé',
  [AppointmentStatus.Cancelled]: 'Annulé',
  [AppointmentStatus.Rescheduled]: 'Reporté'
};

export const AppointmentStatusColors: Record<AppointmentStatus, string> = {
  [AppointmentStatus.Scheduled]: 'primary',
  [AppointmentStatus.Confirmed]: 'success',
  [AppointmentStatus.Completed]: 'secondary',
  [AppointmentStatus.Cancelled]: 'danger',
  [AppointmentStatus.Rescheduled]: 'warning'
};

// ============================================================
// 5. CLASSE UTILITAIRE
// ============================================================

export class AppointmentUtils {
  static getStatusLabel(status: AppointmentStatus): string {
    return AppointmentStatusLabels[status] || status;
  }

  static getStatusColor(status: AppointmentStatus): string {
    return AppointmentStatusColors[status] || 'secondary';
  }

  static getFormattedDate(date: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static getFormattedDateShort(date: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  static getFormattedDuration(minutes: number): string {
    return `${minutes} min`;
  }

  static getParticipantName(appointment: Appointment): string {
    return appointment.memberName ?? appointment.visitorName ?? '—';
  }

  static getParticipantPhone(appointment: Appointment): string {
    return appointment.visitorPhone ?? '—';
  }

  static getParticipantEmail(appointment: Appointment): string {
    return appointment.visitorEmail ?? '—';
  }

  static isUpcoming(appointment: Appointment): boolean {
    return new Date(appointment.appointmentDate) > new Date() &&
           appointment.status !== AppointmentStatus.Cancelled;
  }

  static isPast(appointment: Appointment): boolean {
    return new Date(appointment.appointmentDate) < new Date() &&
           appointment.status !== AppointmentStatus.Cancelled;
  }

  static isToday(appointment: Appointment): boolean {
    const today = new Date();
    const date = new Date(appointment.appointmentDate);
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  static getDurationInHours(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    return `${hours}h ${mins > 0 ? mins + 'min' : ''}`;
  }

  static sortByDate(appointments: Appointment[], ascending: boolean = true): Appointment[] {
    return [...appointments].sort((a, b) => {
      const dateA = new Date(a.appointmentDate).getTime();
      const dateB = new Date(b.appointmentDate).getTime();
      return ascending ? dateA - dateB : dateB - dateA;
    });
  }

  static filterByStatus(appointments: Appointment[], status: AppointmentStatus): Appointment[] {
    if (!status) return appointments;
    return appointments.filter(a => a.status === status);
  }

  static filterByPastor(appointments: Appointment[], pastorId: string): Appointment[] {
    if (!pastorId) return appointments;
    return appointments.filter(a => a.pastorId === pastorId);
  }

  static filterUpcoming(appointments: Appointment[]): Appointment[] {
    const now = new Date();
    return appointments.filter(a =>
      new Date(a.appointmentDate) > now &&
      a.status !== AppointmentStatus.Cancelled &&
      a.status !== AppointmentStatus.Completed
    );
  }

  static filterToday(appointments: Appointment[]): Appointment[] {
    const today = new Date();
    return appointments.filter(a => {
      const date = new Date(a.appointmentDate);
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear() &&
             a.status !== AppointmentStatus.Cancelled &&
             a.status !== AppointmentStatus.Completed;
    });
  }

  static getAppointmentStats(appointments: Appointment[]): {
    total: number;
    scheduled: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    rescheduled: number;
    upcoming: number;
    today: number;
  } {
    const scheduled = appointments.filter(a => a.status === AppointmentStatus.Scheduled);
    const confirmed = appointments.filter(a => a.status === AppointmentStatus.Confirmed);
    const completed = appointments.filter(a => a.status === AppointmentStatus.Completed);
    const cancelled = appointments.filter(a => a.status === AppointmentStatus.Cancelled);
    const rescheduled = appointments.filter(a => a.status === AppointmentStatus.Rescheduled);

    return {
      total: appointments.length,
      scheduled: scheduled.length,
      confirmed: confirmed.length,
      completed: completed.length,
      cancelled: cancelled.length,
      rescheduled: rescheduled.length,
      upcoming: this.filterUpcoming(appointments).length,
      today: this.filterToday(appointments).length
    };
  }

  static searchAppointments(appointments: Appointment[], searchTerm: string): Appointment[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return appointments;

    return appointments.filter(a =>
      (a.reason && a.reason.toLowerCase().includes(term)) ||
      (a.visitorName && a.visitorName.toLowerCase().includes(term)) ||
      (a.memberName && a.memberName.toLowerCase().includes(term)) ||
      (a.location && a.location.toLowerCase().includes(term)) ||
      (a.pastorName && a.pastorName.toLowerCase().includes(term))
    );
  }

  // ─── Construction de réponse (Success / Failure) ───

  static Success(data: Appointment): Appointment {
    return { ...data, isSuccess: true };
  }

  static Failure(message: string): Appointment {
    return {
      id: '',
      pastorId: '',
      churchId: '',
      reason: '',
      appointmentDate: '',
      durationMinutes: 0,
      status: AppointmentStatus.Scheduled,
      statusLabel: '',
      statusColor: '',
      createdAt: '',
      createdBy: '',
      isUpcoming: false,
      isPast: false,
      formattedDate: '',
      formattedDuration: '',
      participantName: '—',
      isSuccess: false,
      errorMessage: message
    };
  }
}

// ============================================================
// 6. VALEURS PAR DÉFAUT
// ============================================================

export const DEFAULT_APPOINTMENT_FILTER: AppointmentFilter = {
  page: 1,
  pageSize: 20,
  sortBy: 'appointmentDate',
  sortOrder: 'asc'
};

export const EMPTY_APPOINTMENT: Appointment = {
  id: '',
  pastorId: '',
  churchId: '',
  reason: '',
  appointmentDate: '',
  durationMinutes: 30,
  status: AppointmentStatus.Scheduled,
  statusLabel: 'Planifié',
  statusColor: 'primary',
  createdAt: '',
  createdBy: '',
  isUpcoming: false,
  isPast: false,
  formattedDate: '—',
  formattedDuration: '30 min',
  participantName: '—'
};
