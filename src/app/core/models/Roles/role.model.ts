
export interface Role {
  id: string;
  code: string;
  roleName: string;
  normalizedName: string;
  description?: string;
  permissions: string[];
  isVisible: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  createdByName: string;
  updatedBy?: string;
  updatedByName?: string;
  permissionCount: number;
  isEditable: boolean;
}

export interface RoleCreate {
  code: string;
  roleName: string;
  description?: string;
  permissions: string[];
  isVisible: boolean;
  isSystem?: boolean;
}

export interface RoleUpdate {
  code?: string;
  roleName?: string;
  description?: string;
  permissions?: string[];
  isVisible?: boolean;
  isSystem?: boolean;
}

export interface RoleFilter {
  code?: string;
  roleName?: string;
  normalizedName?: string;
  isVisible?: boolean;
  isSystem?: boolean;
  permission?: string;
  createdFrom?: string;
  createdTo?: string;
  createdBy?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface RoleListResponse {
  items: Role[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface RoleAssign {
  userId: string;
  roleId: string;
}

export interface RoleBulkAssign {
  userIds: string[];
  roleIds: string[];
  replaceExisting: boolean;
}

export interface RolePermissionUpdate {
  roleId: string;
  permissions: string[];
  replaceExisting: boolean;
}

export interface RoleSummary {
  totalRoles: number;
  systemRoles: number;
  customRoles: number;
  visibleRoles: number;
  hiddenRoles: number;
  rolesByPermissionCount: Record<string, number>;
  mostRecentRoles: Role[];
  mostUsedRoles: Role[];
  totalPermissions: number;
}

// Classe utilitaire
export class RoleUtils {
  static getFormattedDate(date?: string): string {
    if (!date) return 'Non renseigné';
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static getStatusBadge(isSystem: boolean, isVisible: boolean): { label: string; color: string } {
    if (isSystem) {
      return { label: 'Système', color: 'primary' };
    }
    if (isVisible) {
      return { label: 'Visible', color: 'success' };
    }
    return { label: 'Masqué', color: 'secondary' };
  }

  static getPermissionCountColor(role: Role): string {
    const count = role.permissionCount;
    if (count === 0) return 'danger';
    if (count <= 5) return 'warning';
    if (count <= 15) return 'info';
    return 'success';
  }

  static isEditable(role: Role): boolean {
    return !role.isSystem;
  }

  static getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  static searchRoles(roles: Role[], searchTerm: string): Role[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return roles;

    return roles.filter(role =>
      role.roleName.toLowerCase().includes(term) ||
      role.code.toLowerCase().includes(term) ||
      (role.description && role.description.toLowerCase().includes(term))
    );
  }

  static groupByPermissionCount(roles: Role[]): Record<string, number> {
    const groups: Record<string, number> = {};
    roles.forEach(role => {
      const key = role.permissionCount === 0 ? '0' :
                  role.permissionCount <= 5 ? '1-5' :
                  role.permissionCount <= 15 ? '6-15' :
                  role.permissionCount <= 30 ? '16-30' : '30+';
      groups[key] = (groups[key] || 0) + 1;
    });
    return groups;
  }
}

// Valeurs par défaut
export const DEFAULT_ROLE_FILTER: RoleFilter = {
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
};
