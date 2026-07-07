export interface AuditLogFilter {
  /** ID de l'utilisateur */
  userId?: string;

  /** Nom d'utilisateur (recherche partielle) */
  username?: string;

  /** Module (ex: Members, Finances, Events) */
  module?: string;

  /** Action (ex: Create, Update, Delete) */
  action?: string;

  /** Type d'entité */
  entityType?: string;

  /** ID de l'entité */
  entityId?: string;

  /** ID de l'église */
  churchId?: string;

  /** Date de début (UTC) */
  startDate?: string; // ou Date

  /** Date de fin (UTC) */
  endDate?: string; // ou Date

  /** Page actuelle (commence à 1) */
  page: number;

  /** Nombre d'éléments par page */
  pageSize: number;

  /** Champ de tri (ex: Timestamp, Username, Action) */
  sortBy?: string;

  /** Ordre de tri (asc/desc) */
  sortOrder?: string;
}

// Valeurs par défaut pour le filtre
export const DEFAULT_AUDIT_FILTER: AuditLogFilter = {
  page: 1,
  pageSize: 20,
  sortBy: 'timestamp',
  sortOrder: 'desc'
};

// Classe utilitaire pour construire un filtre
export class AuditLogFilterBuilder {
  private filter: AuditLogFilter = { ...DEFAULT_AUDIT_FILTER };

  setUserId(userId: string): this {
    this.filter.userId = userId;
    return this;
  }

  setUsername(username: string): this {
    this.filter.username = username;
    return this;
  }

  setModule(module: string): this {
    this.filter.module = module;
    return this;
  }

  setAction(action: string): this {
    this.filter.action = action;
    return this;
  }

  setEntityType(entityType: string): this {
    this.filter.entityType = entityType;
    return this;
  }

  setEntityId(entityId: string): this {
    this.filter.entityId = entityId;
    return this;
  }

  setChurchId(churchId: string): this {
    this.filter.churchId = churchId;
    return this;
  }

  setDateRange(startDate: Date, endDate: Date): this {
    this.filter.startDate = startDate.toISOString();
    this.filter.endDate = endDate.toISOString();
    return this;
  }

  setPage(page: number): this {
    this.filter.page = page;
    return this;
  }

  setPageSize(pageSize: number): this {
    this.filter.pageSize = pageSize;
    return this;
  }

  setSortBy(sortBy: string): this {
    this.filter.sortBy = sortBy;
    return this;
  }

  setSortOrder(sortOrder: 'asc' | 'desc'): this {
    this.filter.sortOrder = sortOrder;
    return this;
  }

  build(): AuditLogFilter {
    return this.filter;
  }
}
