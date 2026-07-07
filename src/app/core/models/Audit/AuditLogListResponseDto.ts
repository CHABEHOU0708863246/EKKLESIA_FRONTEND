import { AuditLogResponse } from "./AuditLogResponseDto";

export interface AuditLogListResponse {
  /** Liste des logs d'audit */
  items: AuditLogResponse[];

  /** Nombre total d'éléments */
  totalCount: number;

  /** Page actuelle */
  currentPage: number;

  /** Nombre total de pages */
  totalPages: number;

  /** Taille de la page */
  pageSize: number;

  /** Indique s'il y a une page précédente */
  hasPreviousPage: boolean;

  /** Indique s'il y a une page suivante */
  hasNextPage: boolean;
}

// Extension pour ajouter des utilitaires
export class AuditLogListResponseUtils {
  static isEmpty(response: AuditLogListResponse): boolean {
    return !response.items || response.items.length === 0;
  }

  static getPageNumbers(response: AuditLogListResponse): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= response.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  static getVisiblePageNumbers(response: AuditLogListResponse): number[] {
    const current = response.currentPage;
    const total = response.totalPages;
    const visible: number[] = [];

    // Afficher toujours la première page
    visible.push(1);

    // Pages autour de la page actuelle
    for (let i = Math.max(2, current - 2); i <= Math.min(total - 1, current + 2); i++) {
      if (visible[visible.length - 1] !== i - 1 && visible[visible.length - 1] + 1 < i) {
        visible.push(-1); // Séparateur
      }
      visible.push(i);
    }

    // Afficher toujours la dernière page
    if (total > 1) {
      if (visible[visible.length - 1] !== total - 1 && visible[visible.length - 1] + 1 < total) {
        visible.push(-1); // Séparateur
      }
      visible.push(total);
    }

    return visible;
  }
}
