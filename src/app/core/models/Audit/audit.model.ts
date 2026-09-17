// src/app/core/models/Audit/audit.model.ts
// ⚠️ Modèles alignés sur EKKLESIA.Dto.Audit (les enums sont sérialisés en
// CHAÎNES par le backend : JsonStringEnumConverter).

export interface AuditLogEntry {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  entityType: string;
  entityId: string;
  entityIdentifier?: string;
  action: string;
  category: string;
  severity: string;
  description?: string;
  ipAddress?: string;
  endpoint?: string;
  httpMethod?: string;
  timestamp: string;

  // Propriétés calculées par le serveur (libellés FR + icônes + couleur)
  actionLabel: string;
  actionIcon: string;
  categoryLabel: string;
  categoryIcon: string;
  severityLabel: string;
  severityColor: string;
  formattedTimestamp: string;
  relativeTime: string;
}

export interface AuditLogDetail extends AuditLogEntry {
  fieldChanges?: { fieldName: string; oldValue?: string; newValue?: string; dataType?: string }[];
  oldSnapshot?: Record<string, unknown>;
  newSnapshot?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AuditLogListResponse {
  items: AuditLogEntry[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

export interface AuditLogFilter {
  userId?: string;
  userFullName?: string;
  entityType?: string;
  entityIdentifier?: string;
  actions?: string[];
  categories?: string[];
  severities?: string[];
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditSeverityDistribution {
  severity: string;
  label: string;
  count: number;
  percentage: number;
}

export interface AuditCategoryDistribution {
  category: string;
  label: string;
  icon: string;
  count: number;
  percentage: number;
}

export interface AuditTopUser {
  userId: string;
  userFullName: string;
  userEmail: string;
  actionCount: number;
  lastActivity: string;
}

export interface AuditDailyActivity {
  date: string;
  count: number;
  criticalCount: number;
  warningCount: number;
}

export interface AuditStatistics {
  totalLogs: number;
  logsLast24h: number;
  criticalAlerts: number;
  warningAlerts: number;
  severityDistribution: AuditSeverityDistribution[];
  categoryDistribution: AuditCategoryDistribution[];
  topActiveUsers: AuditTopUser[];
  dailyActivity: AuditDailyActivity[];
}

export const AUDIT_SEVERITY_OPTIONS = [
  { value: 'Info', label: 'Info', color: '#0984E3' },
  { value: 'Warning', label: 'Avertissement', color: '#FDCB6E' },
  { value: 'Error', label: 'Erreur', color: '#E17055' },
  { value: 'Critical', label: 'Critique', color: '#D63031' }
];

export const AUDIT_CATEGORY_OPTIONS = [
  { value: 'Security', label: 'Sécurité' },
  { value: 'Financial', label: 'Finances' },
  { value: 'Pastoral', label: 'Pastorale' },
  { value: 'Events', label: 'Événements' },
  { value: 'Communication', label: 'Communication' },
  { value: 'System', label: 'Système' },
  { value: 'UserManagement', label: 'Utilisateurs' }
];

export const AUDIT_ACTION_OPTIONS = [
  { value: 'Create', label: 'Création' },
  { value: 'Update', label: 'Modification' },
  { value: 'Delete', label: 'Suppression' },
  { value: 'View', label: 'Consultation' },
  { value: 'List', label: 'Liste / Export' },
  { value: 'Login', label: 'Connexion' },
  { value: 'LoginFailed', label: 'Échec de connexion' },
  { value: 'Logout', label: 'Déconnexion' },
  { value: 'PasswordChange', label: 'Changement de mot de passe' },
  { value: 'PasswordResetRequested', label: 'Réinitialisation demandée' },
  { value: 'Validate', label: 'Validation' },
  { value: 'Reject', label: 'Rejet' },
  { value: 'ExportData', label: 'Export de données' }
];
