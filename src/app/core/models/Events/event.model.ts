// ============================================================
// 1. ENUMS
// ============================================================

export enum EventType {
  SundayService = 'SundayService',
  Conference = 'Conference',
  Seminar = 'Seminar',
  Retreat = 'Retreat',
  PrayerMeeting = 'PrayerMeeting',
  YouthEvent = 'YouthEvent',
  ChildrenEvent = 'ChildrenEvent',
  SpecialService = 'SpecialService',
  Concert = 'Concert',
  BibleStudy = 'BibleStudy',
  Training = 'Training',
  Other = 'Other'
}

export enum EventStatus {
  Scheduled = 'Scheduled',
  Ongoing = 'Ongoing',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  Postponed = 'Postponed'
}

export enum PaymentStatus {
  Pending = 'Pending',
  Paid = 'Paid',
  Cancelled = 'Cancelled',
  Refunded = 'Refunded',
  Failed = 'Failed',      // ✅ Ajouté
  Expired = 'Expired'     // ✅ Ajouté
}

export enum ParticipantProfileType {
  Member = 'Member',       // Membre de l'église
  Berehin = 'Berehin',     // Béréhin (visiteur intégré)
  External = 'External',   // Personne extérieure
  Leader = 'Leader',       // Leader
  Pastor = 'Pastor'        // Pasteur
}

// ============================================================
// 2. MODÈLES DE BASE
// ============================================================

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

// ============================================================
// 3. FORMULE (EventFormula)
// ============================================================

export interface EventFormula {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;          // ex: "FCFA"
  capacity: number;
  registeredCount: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;         // ISO date string
  // Propriétés calculées
  availablePlaces: number;
  isAvailable: boolean;
}

// ============================================================
// 4. PARTICIPANT (EventAttendee)
// ============================================================

export interface EventAttendee {
  id?: string;               // Généré côté serveur
  memberId?: string;
  firstName: string;
  lastName: string;
  fullName: string;          // Calculé (first + last)
  email?: string;
  phone?: string;
  gender?: string;           // ✅ Nouveau
  profileType?: string;      // ✅ Nouveau (reflète ParticipantProfileType)
  formulaId?: string;        // ✅ Nouveau
  formulaName?: string;      // ✅ Nouveau (dénormalisé)
  formulaPrice?: number;     // ✅ Nouveau
  paymentMethod?: string;    // ✅ Nouveau (wave, orange_money, etc.)
  paymentReference?: string; // ✅ Nouveau
  registrationDate: string;  // ISO date
  checkedIn: boolean;
  checkInTime?: string;
  paymentStatus: PaymentStatus;
  paymentStatusLabel: string;
  paymentStatusColor: string;
  notes?: string;
  formattedRegistrationDate: string;
  formattedCheckInTime?: string;
}

// ============================================================
// 5. TRANSACTION DE PAIEMENT (PaymentTransaction)
// ============================================================

export interface PaymentTransaction {
  id: string;
  attendeeId: string;
  eventId: string;
  amount: number;
  currency: string;
  provider: string;          // wave, orange_money, mtn_money
  reference?: string;        // Référence GeniusPay
  paymentUrl?: string;
  checkoutUrl?: string;
  qrCode?: string;           // Base64
  status: PaymentStatus;
  metadata?: Record<string, any>;
  webhookPayload?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

// ============================================================
// 6. ÉVÉNEMENT COMPLET (Event)
// ============================================================

export interface Event {
  id: string;
  title: string;
  description?: string;
  type: EventType;
  typeLabel: string;
  typeIcon: string;
  startDate: string;
  endDate?: string;
  location?: string;
  address?: Address;
  organizerId: string;
  organizerName: string;
  churchId: string;
  churchName?: string;
  siteId?: string;
  siteName?: string;
  capacity?: number;
  // ✅ Nouveau : liste des formules
  formulas: EventFormula[];
  registrationRequired: boolean;
  registrationOpen: boolean;
  registrationDeadline?: string;
  price: number;
  currency: string;
  attendees: EventAttendee[];
  status: EventStatus;
  statusLabel: string;
  statusColor: string;
  isRecurring: boolean;
  recurrencePattern?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  // Propriétés calculées
  attendeeCount: number;
  checkedInCount: number;
  paidCount: number;
  availableSpots: number;
  isFull: boolean;
  formattedStartDate: string;
  formattedEndDate?: string;
  formattedPrice: string;
  duration: string;
  isSuccess?: boolean;
  errorMessage?: string;
}

// ============================================================
// 7. DTOs POUR LES REQUÊTES/RÉPONSES
// ============================================================

// 7.1 DTO pour la formule (retour API)
export interface EventFormulaDto {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  capacity: number;
  registeredCount: number;
  availablePlaces: number;
  isAvailable: boolean;
  isActive: boolean;
  sortOrder: number;
}

// 7.2 DTO pour un participant (retour API)
export interface EventAttendeeDto {
  memberId?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  registrationDate: string;
  checkedIn: boolean;
  checkInTime?: string;
  paymentStatus: PaymentStatus;
  paymentStatusLabel: string;
  paymentStatusColor: string;
  notes?: string;
  formattedRegistrationDate: string;
  formattedCheckInTime?: string;
}

// 7.3 DTO pour l'inscription d'un participant (admin)
export interface EventRegistrationDto {
  memberId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  gender?: string;               // ✅ Nouveau
  profileType: ParticipantProfileType;
  formulaId?: string;            // ✅ Nouveau
  formulaName?: string;
  formulaPrice?: number;
  paymentMethod?: string;
  paymentReference?: string;
  registrationDate?: string;
  checkedIn?: boolean;
  checkInTime?: string;
  paymentStatus?: PaymentStatus;
  notes?: string;
}

// 7.4 DTO pour l'inscription publique (sans compte)
export interface EventPublicRegistrationDto {
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;                // ✅ Requis
  profileType: ParticipantProfileType;
  formulaId: string;             // ✅ Requis
  paymentMethod?: string;        // wave, orange_money, mtn_money
  memberId?: string;             // optionnel si déjà membre
}

// 7.5 Réponse après inscription publique
export interface EventPublicRegistrationResponseDto {
  registrationId: string;
  checkoutUrl?: string;
  paymentUrl?: string;
  qrCode?: string;
  reference?: string;
  amount: number;
  currency: string;
  message: string;
  success: boolean;
}
export interface EventAttendeeCheckIn {
  eventId: string;
  attendeeId: string;
  checkedIn: boolean;
}

export interface EventSummary {
  totalEvents: number;
  upcomingEvents: number;
  ongoingEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  eventsByType: Record<EventType, number>;
  totalAttendees: number;
  totalCheckedIn: number;
  totalPaid: number;
  totalRevenue: number;
  nextEvent?: Event;
  recentEvents: Event[];
  popularEvents: Event[];
  averageAttendeesPerEvent: number;
  checkInRate: number;
  paymentRate: number;
}


// 7.6 DTO pour la création d'un événement
export interface EventCreate {
  title: string;
  description?: string;
  type: EventType;
  startDate: string;            // ISO
  endDate?: string;
  location?: string;
  address?: Address;
  organizerId: string;
  churchId: string;
  siteId?: string;
  capacity?: number;
  registrationRequired?: boolean;
  registrationOpen?: boolean;
  registrationDeadline?: string;
  price?: number;
  currency?: string;
  status?: EventStatus;
  isRecurring?: boolean;
  recurrencePattern?: string;
  formulas?: EventFormula[];
}

// 7.7 DTO pour la mise à jour
export interface EventUpdate {
  title?: string;
  description?: string;
  type?: EventType;
  startDate?: string;
  endDate?: string;
  location?: string;
  address?: Address;
  organizerId?: string;
  churchId?: string;
  siteId?: string;
  capacity?: number;
  registrationRequired?: boolean;
  registrationOpen?: boolean;
  registrationDeadline?: string;
  price?: number;
  currency?: string;
  status?: EventStatus;
  isRecurring?: boolean;
  recurrencePattern?: string;
  formulas?: EventFormula[];
}

export interface EventResponse extends Event {
  isSuccess: boolean;
  errorMessage?: string;
}

// 7.8 DTO pour le filtre de recherche
export interface EventFilter {
  title?: string;
  type?: EventType;
  types?: EventType[];
  status?: EventStatus;
  statuses?: EventStatus[];
  organizerId?: string;
  churchId?: string;
  siteId?: string;
  location?: string;
  registrationRequired?: boolean;
  registrationOpen?: boolean;
  isRecurring?: boolean;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  createdFrom?: string;
  createdTo?: string;
  minPrice?: number;
  maxPrice?: number;
  minAttendees?: number;
  maxAttendees?: number;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 7.9 Réponse paginée
export interface EventListResponse {
  items: Event[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// 7.10 DTO pour le check-in
export interface EventAttendeeCheckInDto {
  eventId: string;
  attendeeId: string;
  checkedIn: boolean;
}

// 7.11 DTO pour la réponse de statut de paiement
export interface RegistrationStatusResponse {
  success: boolean;
  attendeeId: string;
  paymentStatus: string;
  isPaid: boolean;
  reference?: string;
}

// ============================================================
// 8. HELPERS / UTILS
// ============================================================

export const EventTypeLabels: Record<EventType, string> = {
  [EventType.SundayService]: 'Culte dominical',
  [EventType.Conference]: 'Conférence',
  [EventType.Seminar]: 'Séminaire',
  [EventType.Retreat]: 'Retraite',
  [EventType.PrayerMeeting]: 'Réunion de prière',
  [EventType.YouthEvent]: 'Événement jeunes',
  [EventType.ChildrenEvent]: 'Événement enfants',
  [EventType.SpecialService]: 'Service spécial',
  [EventType.Concert]: 'Concert',
  [EventType.BibleStudy]: 'Étude biblique',
  [EventType.Training]: 'Formation',
  [EventType.Other]: 'Autre'
};

export const EventTypeIcons: Record<EventType, string> = {
  [EventType.SundayService]: 'fa-church',
  [EventType.Conference]: 'fa-users',
  [EventType.Seminar]: 'fa-chalkboard-teacher',
  [EventType.Retreat]: 'fa-campground',
  [EventType.PrayerMeeting]: 'fa-praying-hands',
  [EventType.YouthEvent]: 'fa-child',
  [EventType.ChildrenEvent]: 'fa-baby',
  [EventType.SpecialService]: 'fa-star',
  [EventType.Concert]: 'fa-music',
  [EventType.BibleStudy]: 'fa-bible',
  [EventType.Training]: 'fa-graduation-cap',
  [EventType.Other]: 'fa-calendar'
};

export const EventTypeColors: Record<EventType, string> = {
  [EventType.SundayService]: 'primary',
  [EventType.Conference]: 'danger',
  [EventType.Seminar]: 'info',
  [EventType.Retreat]: 'success',
  [EventType.PrayerMeeting]: 'warning',
  [EventType.YouthEvent]: 'purple',
  [EventType.ChildrenEvent]: 'pink',
  [EventType.SpecialService]: 'gold',
  [EventType.Concert]: 'orange',
  [EventType.BibleStudy]: 'teal',
  [EventType.Training]: 'indigo',
  [EventType.Other]: 'secondary'
};

export const EventStatusLabels: Record<EventStatus, string> = {
  [EventStatus.Scheduled]: 'Planifié',
  [EventStatus.Ongoing]: 'En cours',
  [EventStatus.Completed]: 'Terminé',
  [EventStatus.Cancelled]: 'Annulé',
  [EventStatus.Postponed]: 'Reporté'
};

export const EventStatusColors: Record<EventStatus, string> = {
  [EventStatus.Scheduled]: 'primary',
  [EventStatus.Ongoing]: 'success',
  [EventStatus.Completed]: 'secondary',
  [EventStatus.Cancelled]: 'danger',
  [EventStatus.Postponed]: 'warning'
};

export const PaymentStatusLabels: Record<PaymentStatus, string> = {
  [PaymentStatus.Pending]: 'En attente',
  [PaymentStatus.Paid]: 'Payé',
  [PaymentStatus.Cancelled]: 'Annulé',
  [PaymentStatus.Refunded]: 'Remboursé',
  [PaymentStatus.Failed]: 'Échoué',     // ✅
  [PaymentStatus.Expired]: 'Expiré'     // ✅
};

export const PaymentStatusColors: Record<PaymentStatus, string> = {
  [PaymentStatus.Pending]: 'warning',
  [PaymentStatus.Paid]: 'success',
  [PaymentStatus.Cancelled]: 'danger',
  [PaymentStatus.Refunded]: 'secondary',
  [PaymentStatus.Failed]: 'danger',     // ✅
  [PaymentStatus.Expired]: 'secondary'  // ✅
};

export const ParticipantProfileLabels: Record<ParticipantProfileType, string> = {
  [ParticipantProfileType.Member]: 'Membre',
  [ParticipantProfileType.Berehin]: 'Béréhin',
  [ParticipantProfileType.External]: 'Externe',
  [ParticipantProfileType.Leader]: 'Leader',
  [ParticipantProfileType.Pastor]: 'Pasteur'
};

export const ParticipantProfileColors: Record<ParticipantProfileType, string> = {
  [ParticipantProfileType.Member]: 'primary',
  [ParticipantProfileType.Berehin]: 'success',
  [ParticipantProfileType.External]: 'secondary',
  [ParticipantProfileType.Leader]: 'warning',
  [ParticipantProfileType.Pastor]: 'danger'
};

// ============================================================
// 9. CLASSE UTILITAIRE (EventUtils)
// ============================================================

export class EventUtils {
  static getTypeLabel(type: EventType): string {
    return EventTypeLabels[type] || type;
  }

  static getTypeIcon(type: EventType): string {
    return EventTypeIcons[type] || 'fa-calendar';
  }

  static getTypeColor(type: EventType): string {
    return EventTypeColors[type] || 'secondary';
  }

  static getStatusLabel(status: EventStatus): string {
    return EventStatusLabels[status] || status;
  }

  static getStatusColor(status: EventStatus): string {
    return EventStatusColors[status] || 'secondary';
  }

  static getPaymentStatusLabel(status: PaymentStatus): string {
    return PaymentStatusLabels[status] || status;
  }

  static getPaymentStatusColor(status: PaymentStatus): string {
    return PaymentStatusColors[status] || 'secondary';
  }

  static getParticipantProfileLabel(profile: ParticipantProfileType): string {
    return ParticipantProfileLabels[profile] || profile;
  }

  static getParticipantProfileColor(profile: ParticipantProfileType): string {
    return ParticipantProfileColors[profile] || 'secondary';
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

  static getDuration(startDate: string | Date, endDate?: string | Date): string {
    if (!endDate) return 'N/A';
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return `${diffHours.toFixed(1)}h`;
  }

  static getFormattedPrice(price: number, currency: string): string {
    if (price === 0) return 'Gratuit';
    return `${price.toLocaleString()} ${currency}`;
  }

  static getAttendeeFullName(attendee: EventAttendee): string {
    return `${attendee.firstName} ${attendee.lastName}`.trim();
  }

  static getAttendanceRate(event: Event): number {
    if (!event.capacity || event.capacity === 0) return 0;
    return Math.round((event.attendeeCount / event.capacity) * 100);
  }

  static getAttendanceRateColor(rate: number): string {
    if (rate >= 80) return 'success';
    if (rate >= 50) return 'warning';
    return 'danger';
  }

  static getCheckInRate(event: Event): number {
    if (event.attendeeCount === 0) return 0;
    return Math.round((event.checkedInCount / event.attendeeCount) * 100);
  }

  static searchEvents(events: Event[], searchTerm: string): Event[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return events;
    return events.filter(event =>
      event.title.toLowerCase().includes(term) ||
      (event.description && event.description.toLowerCase().includes(term)) ||
      (event.location && event.location.toLowerCase().includes(term)) ||
      event.organizerName.toLowerCase().includes(term)
    );
  }

  static filterByStatus(events: Event[], status: EventStatus): Event[] {
    if (!status) return events;
    return events.filter(event => event.status === status);
  }

  static filterByType(events: Event[], type: EventType): Event[] {
    if (!type) return events;
    return events.filter(event => event.type === type);
  }

  static filterUpcoming(events: Event[]): Event[] {
    const now = new Date();
    return events.filter(event =>
      new Date(event.startDate) > now &&
      event.status !== EventStatus.Cancelled
    );
  }

  static filterOngoing(events: Event[]): Event[] {
    const now = new Date();
    return events.filter(event =>
      new Date(event.startDate) <= now &&
      (!event.endDate || new Date(event.endDate) >= now) &&
      event.status === EventStatus.Ongoing
    );
  }

  static sortByDate(events: Event[], ascending: boolean = true): Event[] {
    return [...events].sort((a, b) => {
      const dateA = new Date(a.startDate).getTime();
      const dateB = new Date(b.startDate).getTime();
      return ascending ? dateA - dateB : dateB - dateA;
    });
  }

  static sortByAttendees(events: Event[], ascending: boolean = false): Event[] {
    return [...events].sort((a, b) =>
      ascending ? a.attendeeCount - b.attendeeCount : b.attendeeCount - a.attendeeCount
    );
  }

  static getNextEvent(events: Event[]): Event | undefined {
    const upcoming = this.filterUpcoming(events);
    return this.sortByDate(upcoming, true)[0];
  }

  static getMostPopularEvent(events: Event[]): Event | undefined {
    return this.sortByAttendees(events, false)[0];
  }

  static getEventStats(events: Event[]): {
    total: number;
    upcoming: number;
    ongoing: number;
    completed: number;
    cancelled: number;
    totalAttendees: number;
    averageAttendees: number;
  } {
    const now = new Date();
    const upcoming = events.filter(e => new Date(e.startDate) > now && e.status !== EventStatus.Cancelled);
    const ongoing = events.filter(e =>
      new Date(e.startDate) <= now &&
      (!e.endDate || new Date(e.endDate) >= now) &&
      e.status === EventStatus.Ongoing
    );
    const completed = events.filter(e => e.status === EventStatus.Completed);
    const cancelled = events.filter(e => e.status === EventStatus.Cancelled);
    const totalAttendees = events.reduce((sum, e) => sum + e.attendeeCount, 0);

    return {
      total: events.length,
      upcoming: upcoming.length,
      ongoing: ongoing.length,
      completed: completed.length,
      cancelled: cancelled.length,
      totalAttendees: totalAttendees,
      averageAttendees: events.length > 0 ? Math.round(totalAttendees / events.length) : 0
    };
  }
}

export interface EventAttendeeRegister {
  eventId: string;
  memberId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  paymentStatus?: PaymentStatus;
  notes?: string;
}


// ============================================================
// 10. DEFAUTS
// ============================================================

export const DEFAULT_EVENT_FILTER: EventFilter = {
  page: 1,
  pageSize: 20,
  sortBy: 'startDate',
  sortOrder: 'asc'
};
