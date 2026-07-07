export interface UserActivity {
  /** ID de l'utilisateur */
  userId: string;

  /** Nom d'utilisateur */
  username: string;

  /** Nombre d'actions effectuées */
  actionCount: number;

  /** Dernière action */
  lastActionDate?: string; // ou Date
}

// Extension pour ajouter des utilitaires
export class UserActivityUtils {
  static getFormattedLastAction(activity: UserActivity): string {
    if (!activity.lastActionDate) return 'Jamais';
    const date = new Date(activity.lastActionDate);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static getActivityLevel(activity: UserActivity): 'high' | 'medium' | 'low' {
    if (activity.actionCount > 50) return 'high';
    if (activity.actionCount > 20) return 'medium';
    return 'low';
  }

  static getLevelColor(activity: UserActivity): string {
    const level = this.getActivityLevel(activity);
    const colors: Record<string, string> = {
      'high': 'danger',
      'medium': 'warning',
      'low': 'success'
    };
    return colors[level];
  }
}
