export interface AuditLogCreate {
  /** ID de l'utilisateur ayant effectué l'action */
  userId: string;

  /** Nom d'utilisateur */
  username: string;

  /** Action effectuée (ex: Create, Update, Delete, Login, etc.) */
  action: string;

  /** Module concerné (ex: Members, Finances, Events, etc.) */
  module: string;

  /** Type d'entité concernée (ex: Member, Offering, Event, etc.) */
  entityType: string;

  /** ID de l'entité concernée */
  entityId: string;

  /** Changements effectués (anciennes et nouvelles valeurs) */
  changes?: Record<string, any>;

  /** Adresse IP de l'utilisateur */
  ipAddress?: string;

  /** User Agent du navigateur */
  userAgent?: string;

  /** ID de l'église */
  churchId: string;
}

// Classe utilitaire pour créer un log d'audit
export class AuditLogCreateBuilder {
  private log: Partial<AuditLogCreate> = {};

  setUserId(userId: string): this {
    this.log.userId = userId;
    return this;
  }

  setUsername(username: string): this {
    this.log.username = username;
    return this;
  }

  setAction(action: string): this {
    this.log.action = action;
    return this;
  }

  setModule(module: string): this {
    this.log.module = module;
    return this;
  }

  setEntityType(entityType: string): this {
    this.log.entityType = entityType;
    return this;
  }

  setEntityId(entityId: string): this {
    this.log.entityId = entityId;
    return this;
  }

  setChanges(changes: Record<string, any>): this {
    this.log.changes = changes;
    return this;
  }

  setIpAddress(ipAddress: string): this {
    this.log.ipAddress = ipAddress;
    return this;
  }

  setUserAgent(userAgent: string): this {
    this.log.userAgent = userAgent;
    return this;
  }

  setChurchId(churchId: string): this {
    this.log.churchId = churchId;
    return this;
  }

  build(): AuditLogCreate {
    if (!this.log.userId) throw new Error('userId is required');
    if (!this.log.username) throw new Error('username is required');
    if (!this.log.action) throw new Error('action is required');
    if (!this.log.module) throw new Error('module is required');
    if (!this.log.entityType) throw new Error('entityType is required');
    if (!this.log.entityId) throw new Error('entityId is required');
    if (!this.log.churchId) throw new Error('churchId is required');

    return this.log as AuditLogCreate;
  }
}
