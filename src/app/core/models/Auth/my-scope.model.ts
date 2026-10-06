/** Entité (site ou zone) du périmètre de l'utilisateur connecté. */
export interface ScopeEntity {
  id: string;
  name: string;
  scope?: string;
  isPrimary?: boolean;
}

/** Périmètre « clair » de l'utilisateur connecté (rôles, église, sites, zones). */
export interface MyScope {
  fullName: string;
  roles: string[];
  isGlobalScope: boolean;
  churchId?: string;
  churchName?: string;
  scopeLabel: string;
  sites: ScopeEntity[];
  zones: ScopeEntity[];
}
