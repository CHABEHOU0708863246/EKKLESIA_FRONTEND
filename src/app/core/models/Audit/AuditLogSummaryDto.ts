import { AuditLogResponse } from "./AuditLogResponseDto";
import { UserActivity } from "./UserActivityDto";

export interface AuditLogSummary {
  /** Nombre total de logs */
  totalLogs: number;

  /** Répartition par module */
  logsByModule: Record<string, number>;

  /** Répartition par action */
  logsByAction: Record<string, number>;

  /** Top 5 des utilisateurs les plus actifs */
  topActiveUsers: UserActivity[];

  /** Nombre de logs par jour (7 derniers jours) */
  logsByDay: Record<string, number>;

  /** Dernier log d'audit */
  lastLog?: AuditLogResponse;
}

// Utilitaires pour le résumé
export class AuditLogSummaryUtils {
  static getTopModules(summary: AuditLogSummary, limit: number = 5): [string, number][] {
    return Object.entries(summary.logsByModule)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }

  static getTopActions(summary: AuditLogSummary, limit: number = 5): [string, number][] {
    return Object.entries(summary.logsByAction)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }

  static getChartData(summary: AuditLogSummary): { labels: string[]; data: number[] } {
    const sortedDays = Object.entries(summary.logsByDay)
      .sort((a, b) => a[0].localeCompare(b[0]));

    return {
      labels: sortedDays.map(([day]) => day),
      data: sortedDays.map(([, count]) => count)
    };
  }
}
