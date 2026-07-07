export interface AuditLogResponse {
  /** ID du log d'audit */
  id: string;

  /** ID de l'utilisateur ayant effectué l'action */
  userId: string;

  /** Nom d'utilisateur */
  username: string;

  /** Action effectuée */
  action: string;

  /** Module concerné */
  module: string;

  /** Type d'entité concernée */
  entityType: string;

  /** ID de l'entité concernée */
  entityId: string;

  /** Changements effectués */
  changes?: Record<string, any>;

  /** Adresse IP de l'utilisateur */
  ipAddress?: string;

  /** User Agent du navigateur */
  userAgent?: string;

  /** Date et heure de l'action */
  timestamp: string; // ou Date

  /** ID de l'église */
  churchId: string;

  /** Nom de l'église (ajouté pour l'affichage) */
  churchName?: string;

  /** Date formatée pour l'affichage */
  formattedDate?: string;
}

// Extension pour ajouter des propriétés calculées
export class AuditLogResponseUtils {
  static getFormattedDate(log: AuditLogResponse): string {
    if (log.formattedDate) return log.formattedDate;
    const date = new Date(log.timestamp);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  static getActionColor(action: string): string {
    const colors: Record<string, string> = {
      'Create': 'success',
      'Update': 'warning',
      'Delete': 'danger',
      'Login': 'info',
      'Logout': 'secondary',
      'Export': 'primary',
      'Import': 'primary',
      'Validate': 'success',
      'Reject': 'danger'
    };
    return colors[action] || 'secondary';
  }

  static getActionIcon(action: string): string {
    const icons: Record<string, string> = {
      'Create': 'fa-plus-circle',
      'Update': 'fa-edit',
      'Delete': 'fa-trash',
      'Login': 'fa-sign-in-alt',
      'Logout': 'fa-sign-out-alt',
      'Export': 'fa-download',
      'Import': 'fa-upload',
      'Validate': 'fa-check-circle',
      'Reject': 'fa-times-circle'
    };
    return icons[action] || 'fa-circle';
  }
}
