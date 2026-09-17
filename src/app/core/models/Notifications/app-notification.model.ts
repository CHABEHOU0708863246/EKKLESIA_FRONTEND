// src/app/core/models/Notifications/app-notification.model.ts

/** Nature d'une notification (pilote icône + couleur). */
export type AppNotificationType = 'Info' | 'Success' | 'Warning' | 'Error' | 'Reminder' | 'Alert';

/** Domaine métier concerné. */
export type AppNotificationCategory =
  | 'System' | 'Security' | 'Members' | 'Pastoral'
  | 'Events' | 'Services' | 'Finances' | 'Communication';

/** Population visée lors de l'envoi. */
export type NotificationTargetType = 'User' | 'Role' | 'Church' | 'Site' | 'Global';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: AppNotificationType;
  typeLabel: string;
  category: AppNotificationCategory;
  categoryLabel: string;
  link?: string;
  isRead: boolean;
  readAt?: string;
  emailEnabled: boolean;
  emailSentAt?: string;
  scheduledAt?: string;
  createdAt: string;
  createdByName: string;
}

export interface AppNotificationListResponse {
  items: AppNotification[];
  totalCount: number;
  unreadCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

export interface AppNotificationUnreadCount {
  unread: number;
}

export interface AppNotificationCreate {
  title: string;
  message: string;
  type: AppNotificationType;
  category: AppNotificationCategory;
  link?: string;
  targetType: NotificationTargetType;
  targetId?: string;
  emailEnabled: boolean;
  scheduledAt?: string;
  expiresAt?: string;
}

export interface AppNotificationCreationResult {
  recipients: number;
  emailQueued: number;
}

export interface AppNotificationPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  eventReminders: boolean;
  systemAlerts: boolean;
  pastoralUpdates: boolean;
  newsletter: boolean;
}

export const NOTIFICATION_TYPE_OPTIONS: { value: AppNotificationType; label: string; color: string }[] = [
  { value: 'Info', label: 'Information', color: '#6C5CE7' },
  { value: 'Success', label: 'Succès', color: '#00B894' },
  { value: 'Warning', label: 'Avertissement', color: '#FDCB6E' },
  { value: 'Error', label: 'Erreur', color: '#E17055' },
  { value: 'Reminder', label: 'Rappel', color: '#0984E3' },
  { value: 'Alert', label: 'Alerte', color: '#E17055' }
];

export const NOTIFICATION_CATEGORY_OPTIONS: { value: AppNotificationCategory; label: string }[] = [
  { value: 'System', label: 'Système' },
  { value: 'Security', label: 'Sécurité' },
  { value: 'Members', label: 'Membres' },
  { value: 'Pastoral', label: 'Pastoral' },
  { value: 'Events', label: 'Événements' },
  { value: 'Services', label: 'Cultes' },
  { value: 'Finances', label: 'Finances' },
  { value: 'Communication', label: 'Communication' }
];

export const NOTIFICATION_TARGET_OPTIONS: { value: NotificationTargetType; label: string }[] = [
  { value: 'User', label: 'Un utilisateur précis' },
  { value: 'Role', label: 'Tous les utilisateurs d’un rôle' },
  { value: 'Church', label: 'Tous les utilisateurs d’une église' },
  { value: 'Site', label: 'Tous les utilisateurs d’un site' },
  { value: 'Global', label: 'Tous les utilisateurs actifs' }
];
