// src/app/core/models/role.dtos.ts

// ──────────────────────────────────────────────────────────────
// 📝 DTOs DE CRÉATION ET MISE À JOUR
// ──────────────────────────────────────────────────────────────

/**
 * DTO pour la création d'un rôle
 * Correspond à RoleCreateDto en C#
 */
export interface RoleCreateDto {
  /** Code unique du rôle (ex: SUPER_ADMIN) */
  code: string;

  /** Nom affiché du rôle (ex: Super Administrateur) */
  roleName: string;

  /** Description du rôle et de ses responsabilités */
  description?: string;

  /** Liste des permissions associées au rôle */
  permissions?: string[];

  /** Indique si le rôle est visible dans les listes */
  isVisible?: boolean;

  /** Indique si le rôle est système (non modifiable) */
  isSystem?: boolean;
}

/**
 * DTO pour la mise à jour d'un rôle
 * Correspond à RoleUpdateDto en C#
 */
export interface RoleUpdateDto {
  /** Code unique du rôle */
  code?: string;

  /** Nom affiché du rôle */
  roleName?: string;

  /** Description du rôle */
  description?: string;

  /** Liste des permissions */
  permissions?: string[];

  /** Visibilité du rôle */
  isVisible?: boolean;

  /** Statut système (protégé) */
  isSystem?: boolean;
}

// ──────────────────────────────────────────────────────────────
// 📤 DTOs DE RÉPONSE
// ──────────────────────────────────────────────────────────────

/**
 * DTO pour la réponse d'un rôle
 * Correspond à RoleResponseDto en C#
 */
export interface RoleResponseDto {
  /** Identifiant unique du rôle */
  id: string;

  /** Code unique du rôle */
  code: string;

  /** Nom affiché du rôle */
  roleName: string;

  /** Nom normalisé (en majuscules) */
  normalizedName: string;

  /** Description du rôle */
  description?: string;

  /** Liste des permissions */
  permissions: string[];

  /** Visibilité du rôle */
  isVisible: boolean;

  /** Statut système */
  isSystem: boolean;

  /** Date de création */
  createdAt: Date;

  /** Date de dernière modification */
  updatedAt?: Date;

  /** ID de l'utilisateur créateur */
  createdBy: string;

  /** Nom de l'utilisateur créateur */
  createdByName: string;

  /** ID du dernier modificateur */
  updatedBy?: string;

  /** Nom du dernier modificateur */
  updatedByName?: string;

  /** Nombre de permissions (propriété calculée) */
  permissionCount?: number;

  /** Date de création formatée */
  formattedCreatedAt?: string;

  /** Date de modification formatée */
  formattedUpdatedAt?: string;

  /** Indique si le rôle est modifiable */
  isEditable?: boolean;

  /** Nombre d'utilisateurs ayant ce rôle (propriété additionnelle) */
  userCount?: number;
}

/**
 * Version simplifiée pour les listes déroulantes
 */
export interface RoleDropdownDto {
  id: string;
  code: string;
  roleName: string;
  isSystem: boolean;
  isVisible: boolean;
}

// ──────────────────────────────────────────────────────────────
// 🔍 DTOs DE FILTRE ET RECHERCHE
// ──────────────────────────────────────────────────────────────

/**
 * DTO pour le filtrage des rôles
 * Correspond à RoleFilterDto en C#
 */
export interface RoleFilterDto {
  /** Filtrer par code */
  code?: string;

  /** Filtrer par nom */
  roleName?: string;

  /** Filtrer par nom normalisé */
  normalizedName?: string;

  /** Filtrer par visibilité */
  isVisible?: boolean;

  /** Filtrer par statut système */
  isSystem?: boolean;

  /** Filtrer par permission spécifique */
  permission?: string;

  /** Date de création - début */
  createdFrom?: Date;

  /** Date de création - fin */
  createdTo?: Date;

  /** ID du créateur */
  createdBy?: string;

  /** Numéro de page */
  page: number;

  /** Taille de la page */
  pageSize: number;

  /** Champ de tri */
  sortBy?: string;

  /** Ordre de tri ('asc' ou 'desc') */
  sortOrder?: 'asc' | 'desc';
}

// ──────────────────────────────────────────────────────────────
// 📊 DTOs DE LISTE ET RÉSUMÉ
// ──────────────────────────────────────────────────────────────

/**
 * DTO pour la liste paginée des rôles
 * Correspond à RoleListResponseDto en C#
 */
export interface RoleListResponseDto {
  /** Liste des rôles */
  items: RoleResponseDto[];

  /** Nombre total de rôles */
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

/**
 * DTO pour le résumé des rôles
 * Correspond à RoleSummaryDto en C#
 */
export interface RoleSummaryDto {
  /** Nombre total de rôles */
  totalRoles: number;

  /** Nombre de rôles système */
  systemRoles: number;

  /** Nombre de rôles personnalisés */
  customRoles: number;

  /** Nombre de rôles visibles */
  visibleRoles: number;

  /** Nombre de rôles masqués */
  hiddenRoles: number;

  /** Répartition par nombre de permissions */
  rolesByPermissionCount: Record<string, number>;

  /** 5 rôles les plus récents */
  mostRecentRoles: RoleResponseDto[];

  /** 5 rôles les plus utilisés */
  mostUsedRoles: RoleResponseDto[];

  /** Nombre total de permissions */
  totalPermissions: number;
}

// ──────────────────────────────────────────────────────────────
// 👤 DTOs D'ASSIGNATION
// ──────────────────────────────────────────────────────────────

/**
 * DTO pour l'assignation d'un rôle à un utilisateur
 * Correspond à RoleAssignDto en C#
 */
export interface RoleAssignDto {
  /** ID de l'utilisateur */
  userId: string;

  /** ID du rôle */
  roleId: string;
}

/**
 * DTO pour l'assignation en masse de rôles
 * Correspond à RoleBulkAssignDto en C#
 */
export interface RoleBulkAssignDto {
  /** IDs des utilisateurs */
  userIds: string[];

  /** IDs des rôles */
  roleIds: string[];

  /** Remplacer les rôles existants */
  replaceExisting?: boolean;
}

/**
 * DTO pour l'assignation de multiples rôles
 * Correspond à RoleMultipleAssignDto en C#
 */
export interface RoleMultipleAssignDto {
  /** ID de l'utilisateur */
  userId: string;

  /** IDs des rôles */
  roleIds: string[];
}

// ──────────────────────────────────────────────────────────────
// 🔐 DTOs DE PERMISSIONS
// ──────────────────────────────────────────────────────────────

/**
 * DTO pour la mise à jour des permissions d'un rôle
 * Correspond à RolePermissionUpdateDto en C#
 */
export interface RolePermissionUpdateDto {
  /** ID du rôle */
  roleId: string;

  /** Liste des permissions */
  permissions: string[];

  /** Remplacer les permissions existantes */
  replaceExisting?: boolean;
}

// ──────────────────────────────────────────────────────────────
// 🛠️ DTOs DE MIGRATION
// ──────────────────────────────────────────────────────────────

/**
 * Résultat de la migration des rôles
 * Correspond à MigrationResult en C#
 */
export interface MigrationResultDto {
  /** Nombre total de rôles trouvés */
  totalFound: number;

  /** Nombre de rôles mis à jour */
  updated: number;

  /** Nombre de noms ajoutés */
  nameAdded: number;

  /** Nombre de champs UpdatedBy ajoutés */
  updatedByAdded: number;

  /** Nombre de champs UpdatedByName ajoutés */
  updatedByNameAdded: number;

  /** Nombre de noms normalisés ajoutés */
  normalizedNamesAdded: number;

  /** Succès de l'opération */
  success: boolean;

  /** Message d'information */
  message?: string;
}

/**
 * Résultat du nettoyage des rôles
 * Correspond à CleanupResult en C#
 */
export interface CleanupResultDto {
  /** Nombre de noms corrigés */
  nameFixed: number;

  /** Nombre de rôles invalides supprimés */
  deletedInvalid: number;

  /** Succès de l'opération */
  success: boolean;

  /** Message d'information */
  message?: string;
}

/**
 * Résultat de la réinitialisation des rôles
 * Correspond à ResetResult en C#
 */
export interface ResetResultDto {
  /** Nombre de rôles avant réinitialisation */
  countBefore: number;

  /** Nombre de rôles supprimés */
  deletedCount: number;

  /** Nombre de rôles après réinitialisation */
  countAfter: number;

  /** Succès de l'opération */
  success: boolean;

  /** Message d'information */
  message?: string;
}

// ──────────────────────────────────────────────────────────────
// 🛠️ VALEURS PAR DÉFAUT
// ──────────────────────────────────────────────────────────────

export const DEFAULT_ROLE_FILTER: RoleFilterDto = {
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
};

export const DEFAULT_ROLE_CREATE: RoleCreateDto = {
  code: '',
  roleName: '',
  description: '',
  permissions: [],
  isVisible: true,
  isSystem: false
};

export const DEFAULT_ROLE_UPDATE: RoleUpdateDto = {
  code: '',
  roleName: '',
  description: '',
  permissions: [],
  isVisible: true,
  isSystem: false
};

// ──────────────────────────────────────────────────────────────
// 🛠️ CLASSES UTILITAIRES
// ──────────────────────────────────────────────────────────────

export class RoleDtoUtils {
  /**
   * Crée un DTO de réponse à partir de données brutes
   */
  static createRoleResponse(data: Partial<RoleResponseDto>): RoleResponseDto {
    return {
      id: data.id || '',
      code: data.code || '',
      roleName: data.roleName || '',
      normalizedName: data.normalizedName || '',
      description: data.description,
      permissions: data.permissions || [],
      isVisible: data.isVisible ?? true,
      isSystem: data.isSystem ?? false,
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt,
      createdBy: data.createdBy || '',
      createdByName: data.createdByName || '',
      updatedBy: data.updatedBy,
      updatedByName: data.updatedByName,
      permissionCount: data.permissions?.length || 0,
      formattedCreatedAt: data.createdAt ?
        new Date(data.createdAt).toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : undefined,
      formattedUpdatedAt: data.updatedAt ?
        new Date(data.updatedAt).toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : undefined,
      isEditable: data.isSystem !== true
    };
  }

  /**
   * Convertit un RoleResponseDto en RoleDropdownDto
   */
  static toDropdown(role: RoleResponseDto): RoleDropdownDto {
    return {
      id: role.id,
      code: role.code,
      roleName: role.roleName,
      isSystem: role.isSystem,
      isVisible: role.isVisible
    };
  }

  /**
   * Formate une date pour l'affichage
   */
  static formatDate(date: Date | string | undefined): string {
    if (!date) return 'Non renseigné';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Récupère les initiales d'un nom de rôle
   */
  static getInitials(roleName: string): string {
    if (!roleName) return '?';
    const parts = roleName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  /**
   * Vérifie si un rôle a une permission spécifique
   */
  static hasPermission(role: RoleResponseDto, permission: string): boolean {
    return role.permissions?.includes(permission) || false;
  }

  /**
   * Vérifie si un rôle a toutes les permissions spécifiées
   */
  static hasAllPermissions(role: RoleResponseDto, permissions: string[]): boolean {
    return permissions.every(p => this.hasPermission(role, p));
  }

  /**
   * Récupère la couleur associée au rôle
   */
  static getRoleColor(role: RoleResponseDto): string {
    if (role.isSystem) return 'primary';
    if (!role.isVisible) return 'secondary';
    if (role.permissions?.length === 0) return 'warning';
    return 'success';
  }

  /**
   * Récupère le libellé du statut du rôle
   */
  static getStatusLabel(role: RoleResponseDto): string {
    if (role.isSystem) return 'Système';
    if (!role.isVisible) return 'Masqué';
    return 'Actif';
  }

  /**
   * Récupère la classe CSS du statut
   */
  static getStatusClass(role: RoleResponseDto): string {
    if (role.isSystem) return 'badge-primary';
    if (!role.isVisible) return 'badge-secondary';
    return 'badge-success';
  }

  /**
   * Vérifie si le rôle est modifiable
   */
  static isEditable(role: RoleResponseDto): boolean {
    return !role.isSystem;
  }

  /**
   * Vérifie si le rôle peut être supprimé
   */
  static isDeletable(role: RoleResponseDto): boolean {
    return !role.isSystem && (role.userCount || 0) === 0;
  }

  /**
   * Compte le nombre de permissions
   */
  static countPermissions(role: RoleResponseDto): number {
    return role.permissions?.length || 0;
  }

  /**
   * Trie les rôles par nom
   */
  static sortByName(roles: RoleResponseDto[], ascending: boolean = true): RoleResponseDto[] {
    return [...roles].sort((a, b) => {
      const comparison = a.roleName.localeCompare(b.roleName);
      return ascending ? comparison : -comparison;
    });
  }

  /**
   * Filtre les rôles par recherche
   */
  static filterBySearch(roles: RoleResponseDto[], searchTerm: string): RoleResponseDto[] {
    if (!searchTerm) return roles;
    const term = searchTerm.toLowerCase();
    return roles.filter(role =>
      role.roleName.toLowerCase().includes(term) ||
      role.code.toLowerCase().includes(term) ||
      (role.description && role.description.toLowerCase().includes(term))
    );
  }
}

// ──────────────────────────────────────────────────────────────
// 🔄 CONSTANTES DES PERMISSIONS
// ──────────────────────────────────────────────────────────────

/**
 * Constantes pour les permissions disponibles
 */
export const PERMISSIONS = {
  // Membres
  Member_Create: 'Member_Create',
  Member_Read: 'Member_Read',
  Member_Update: 'Member_Update',
  Member_Delete: 'Member_Delete',
  Member_Validate: 'Member_Validate',
  Member_Export: 'Member_Export',
  Member_Import: 'Member_Import',
  Member_Status_Manage: 'Member_Status_Manage',
  Member_History_View: 'Member_History_View',
  Member_Family_Manage: 'Member_Family_Manage',
  Member_Report_Generate: 'Member_Report_Generate',

  // Pastoral
  Pastoral_Note_Create: 'Pastoral_Note_Create',
  Pastoral_Note_Read: 'Pastoral_Note_Read',
  Pastoral_Note_Update: 'Pastoral_Note_Update',
  Pastoral_Note_Delete: 'Pastoral_Note_Delete',
  Pastoral_Note_Export: 'Pastoral_Note_Export',
  Pastoral_Note_View_All: 'Pastoral_Note_View_All',
  Pastoral_Appointment_Manage: 'Pastoral_Appointment_Manage',
  Pastoral_Prayer_Manage: 'Pastoral_Prayer_Manage',
  Pastoral_Report_Generate: 'Pastoral_Report_Generate',

  // Cellules
  Cell_Create: 'Cell_Create',
  Cell_Read: 'Cell_Read',
  Cell_Update: 'Cell_Update',
  Cell_Delete: 'Cell_Delete',
  Cell_Assign: 'Cell_Assign',
  Cell_Attendance_Read: 'Cell_Attendance_Read',
  Cell_Attendance_Update: 'Cell_Attendance_Update',
  Cell_Report_Submit: 'Cell_Report_Submit',
  Cell_Report_Generate: 'Cell_Report_Generate',
  Cell_Leader_Manage: 'Cell_Leader_Manage',

  // Finances
  Finance_Offering_Create: 'Finance_Offering_Create',
  Finance_Offering_Read: 'Finance_Offering_Read',
  Finance_Offering_Update: 'Finance_Offering_Update',
  Finance_Offering_Delete: 'Finance_Offering_Delete',
  Finance_Offering_Validate: 'Finance_Offering_Validate',
  Finance_Offering_Export: 'Finance_Offering_Export',
  Finance_Receipt_Generate: 'Finance_Receipt_Generate',
  Finance_Expense_Create: 'Finance_Expense_Create',
  Finance_Expense_Read: 'Finance_Expense_Read',
  Finance_Expense_Update: 'Finance_Expense_Update',
  Finance_Expense_Validate: 'Finance_Expense_Validate',
  Finance_Expense_Approve: 'Finance_Expense_Approve',
  Finance_Expense_Export: 'Finance_Expense_Export',
  Finance_Budget_Create: 'Finance_Budget_Create',
  Finance_Budget_Read: 'Finance_Budget_Read',
  Finance_Budget_Update: 'Finance_Budget_Update',
  Finance_Budget_Approve: 'Finance_Budget_Approve',
  Finance_Budget_Follow: 'Finance_Budget_Follow',
  Finance_Consolidated_View: 'Finance_Consolidated_View',
  Finance_Report_Generate: 'Finance_Report_Generate',
  Finance_Report_Export: 'Finance_Report_Export',
  Finance_Bank_Manage: 'Finance_Bank_Manage',
  Finance_Transfer_Make: 'Finance_Transfer_Make',

  // Événements
  Event_Create: 'Event_Create',
  Event_Read: 'Event_Read',
  Event_Update: 'Event_Update',
  Event_Delete: 'Event_Delete',
  Event_Register: 'Event_Register',
  Event_Registration_Manage: 'Event_Registration_Manage',
  Event_Checkin: 'Event_Checkin',
  Event_Payment_Manage: 'Event_Payment_Manage',
  Event_Report_Generate: 'Event_Report_Generate',

  // Cultes
  Service_Create: 'Service_Create',
  Service_Read: 'Service_Read',
  Service_Update: 'Service_Update',
  Service_Attendance_Record: 'Service_Attendance_Record',
  Service_Attendance_Read: 'Service_Attendance_Read',
  Service_Planning_Manage: 'Service_Planning_Manage',
  Service_Team_Manage: 'Service_Team_Manage',

  // Patrimoine
  Property_Create: 'Property_Create',
  Property_Read: 'Property_Read',
  Property_Update: 'Property_Update',
  Property_Delete: 'Property_Delete',
  Property_Export: 'Property_Export',
  Contract_Create: 'Contract_Create',
  Contract_Read: 'Contract_Read',
  Contract_Update: 'Contract_Update',
  Contract_Validate: 'Contract_Validate',
  Contract_Terminate: 'Contract_Terminate',
  Contract_Renew: 'Contract_Renew',
  Contract_Export: 'Contract_Export',
  Maintenance_Report: 'Maintenance_Report',
  Maintenance_Manage: 'Maintenance_Manage',
  Maintenance_Assign: 'Maintenance_Assign',
  Maintenance_Complete: 'Maintenance_Complete',
  Insurance_Manage: 'Insurance_Manage',

  // Communication
  Content_Create: 'Content_Create',
  Content_Read: 'Content_Read',
  Content_Update: 'Content_Update',
  Content_Delete: 'Content_Delete',
  Content_Publish: 'Content_Publish',
  Content_Archive: 'Content_Archive',
  Content_Export: 'Content_Export',
  Communication_Broadcast: 'Communication_Broadcast',
  Communication_Newsletter: 'Communication_Newsletter',
  Communication_Template_Manage: 'Communication_Template_Manage',
  Communication_Plan: 'Communication_Plan',
  Communication_Stats_View: 'Communication_Stats_View',
  Communication_Sms_Manage: 'Communication_Sms_Manage',
  Communication_Email_Manage: 'Communication_Email_Manage',

  // RH
  Employee_Create: 'Employee_Create',
  Employee_Read: 'Employee_Read',
  Employee_Update: 'Employee_Update',
  Employee_Delete: 'Employee_Delete',
  Employee_Export: 'Employee_Export',
  Payroll_Calculate: 'Payroll_Calculate',
  Payroll_Read: 'Payroll_Read',
  Payroll_Export: 'Payroll_Export',
  Leave_Manage: 'Leave_Manage',
  Leave_Approve: 'Leave_Approve',
  Volunteer_Create: 'Volunteer_Create',
  Volunteer_Read: 'Volunteer_Read',
  Volunteer_Update: 'Volunteer_Update',
  Volunteer_Delete: 'Volunteer_Delete',
  Volunteer_Assign: 'Volunteer_Assign',
  Volunteer_Schedule_Manage: 'Volunteer_Schedule_Manage',
  Volunteer_Schedule_Read: 'Volunteer_Schedule_Read',
  Volunteer_Schedule_Confirm: 'Volunteer_Schedule_Confirm',
  Volunteer_Export: 'Volunteer_Export',

  // Dashboard
  Dashboard_View: 'Dashboard_View',
  Dashboard_Customize: 'Dashboard_Customize',
  Dashboard_Export: 'Dashboard_Export',
  Report_Generate: 'Report_Generate',
  Report_Read: 'Report_Read',
  Report_Export: 'Report_Export',
  Report_Schedule: 'Report_Schedule',

  // Notifications
  Notification_Read: 'Notification_Read',
  Notification_Send: 'Notification_Send',
  Notification_Configure: 'Notification_Configure',
  Notification_Template_Manage: 'Notification_Template_Manage',

  // Administration
  User_Create: 'User_Create',
  User_Read: 'User_Read',
  User_Update: 'User_Update',
  User_Delete: 'User_Delete',
  User_Activate: 'User_Activate',
  User_Deactivate: 'User_Deactivate',
  Role_Manage: 'Role_Manage',
  Permission_Manage: 'Permission_Manage',
  Audit_Read: 'Audit_Read',
  Audit_Export: 'Audit_Export',
  Settings_Read: 'Settings_Read',
  Settings_Update: 'Settings_Update',
  Church_Settings_Manage: 'Church_Settings_Manage',
  Site_Manage: 'Site_Manage'
} as const;

/**
 * Groupes de permissions par module
 */
export const PERMISSIONS_BY_MODULE = {
  Membres: [
    PERMISSIONS.Member_Create,
    PERMISSIONS.Member_Read,
    PERMISSIONS.Member_Update,
    PERMISSIONS.Member_Delete,
    PERMISSIONS.Member_Validate,
    PERMISSIONS.Member_Export,
    PERMISSIONS.Member_Import,
    PERMISSIONS.Member_Status_Manage,
    PERMISSIONS.Member_History_View,
    PERMISSIONS.Member_Family_Manage,
    PERMISSIONS.Member_Report_Generate
  ],
  Pastoral: [
    PERMISSIONS.Pastoral_Note_Create,
    PERMISSIONS.Pastoral_Note_Read,
    PERMISSIONS.Pastoral_Note_Update,
    PERMISSIONS.Pastoral_Note_Delete,
    PERMISSIONS.Pastoral_Note_Export,
    PERMISSIONS.Pastoral_Note_View_All,
    PERMISSIONS.Pastoral_Appointment_Manage,
    PERMISSIONS.Pastoral_Prayer_Manage,
    PERMISSIONS.Pastoral_Report_Generate
  ],
  Cellules: [
    PERMISSIONS.Cell_Create,
    PERMISSIONS.Cell_Read,
    PERMISSIONS.Cell_Update,
    PERMISSIONS.Cell_Delete,
    PERMISSIONS.Cell_Assign,
    PERMISSIONS.Cell_Attendance_Read,
    PERMISSIONS.Cell_Attendance_Update,
    PERMISSIONS.Cell_Report_Submit,
    PERMISSIONS.Cell_Report_Generate,
    PERMISSIONS.Cell_Leader_Manage
  ],
  Finances: [
    PERMISSIONS.Finance_Offering_Create,
    PERMISSIONS.Finance_Offering_Read,
    PERMISSIONS.Finance_Offering_Update,
    PERMISSIONS.Finance_Offering_Delete,
    PERMISSIONS.Finance_Offering_Validate,
    PERMISSIONS.Finance_Offering_Export,
    PERMISSIONS.Finance_Receipt_Generate,
    PERMISSIONS.Finance_Expense_Create,
    PERMISSIONS.Finance_Expense_Read,
    PERMISSIONS.Finance_Expense_Update,
    PERMISSIONS.Finance_Expense_Validate,
    PERMISSIONS.Finance_Expense_Approve,
    PERMISSIONS.Finance_Expense_Export,
    PERMISSIONS.Finance_Budget_Create,
    PERMISSIONS.Finance_Budget_Read,
    PERMISSIONS.Finance_Budget_Update,
    PERMISSIONS.Finance_Budget_Approve,
    PERMISSIONS.Finance_Budget_Follow,
    PERMISSIONS.Finance_Consolidated_View,
    PERMISSIONS.Finance_Report_Generate,
    PERMISSIONS.Finance_Report_Export,
    PERMISSIONS.Finance_Bank_Manage,
    PERMISSIONS.Finance_Transfer_Make
  ],
  Événements: [
    PERMISSIONS.Event_Create,
    PERMISSIONS.Event_Read,
    PERMISSIONS.Event_Update,
    PERMISSIONS.Event_Delete,
    PERMISSIONS.Event_Register,
    PERMISSIONS.Event_Registration_Manage,
    PERMISSIONS.Event_Checkin,
    PERMISSIONS.Event_Payment_Manage,
    PERMISSIONS.Event_Report_Generate
  ],
  Cultes: [
    PERMISSIONS.Service_Create,
    PERMISSIONS.Service_Read,
    PERMISSIONS.Service_Update,
    PERMISSIONS.Service_Attendance_Record,
    PERMISSIONS.Service_Attendance_Read,
    PERMISSIONS.Service_Planning_Manage,
    PERMISSIONS.Service_Team_Manage
  ],
  Patrimoine: [
    PERMISSIONS.Property_Create,
    PERMISSIONS.Property_Read,
    PERMISSIONS.Property_Update,
    PERMISSIONS.Property_Delete,
    PERMISSIONS.Property_Export,
    PERMISSIONS.Contract_Create,
    PERMISSIONS.Contract_Read,
    PERMISSIONS.Contract_Update,
    PERMISSIONS.Contract_Validate,
    PERMISSIONS.Contract_Terminate,
    PERMISSIONS.Contract_Renew,
    PERMISSIONS.Contract_Export,
    PERMISSIONS.Maintenance_Report,
    PERMISSIONS.Maintenance_Manage,
    PERMISSIONS.Maintenance_Assign,
    PERMISSIONS.Maintenance_Complete,
    PERMISSIONS.Insurance_Manage
  ],
  Communication: [
    PERMISSIONS.Content_Create,
    PERMISSIONS.Content_Read,
    PERMISSIONS.Content_Update,
    PERMISSIONS.Content_Delete,
    PERMISSIONS.Content_Publish,
    PERMISSIONS.Content_Archive,
    PERMISSIONS.Content_Export,
    PERMISSIONS.Communication_Broadcast,
    PERMISSIONS.Communication_Newsletter,
    PERMISSIONS.Communication_Template_Manage,
    PERMISSIONS.Communication_Plan,
    PERMISSIONS.Communication_Stats_View,
    PERMISSIONS.Communication_Sms_Manage,
    PERMISSIONS.Communication_Email_Manage
  ],
  RH: [
    PERMISSIONS.Employee_Create,
    PERMISSIONS.Employee_Read,
    PERMISSIONS.Employee_Update,
    PERMISSIONS.Employee_Delete,
    PERMISSIONS.Employee_Export,
    PERMISSIONS.Payroll_Calculate,
    PERMISSIONS.Payroll_Read,
    PERMISSIONS.Payroll_Export,
    PERMISSIONS.Leave_Manage,
    PERMISSIONS.Leave_Approve,
    PERMISSIONS.Volunteer_Create,
    PERMISSIONS.Volunteer_Read,
    PERMISSIONS.Volunteer_Update,
    PERMISSIONS.Volunteer_Delete,
    PERMISSIONS.Volunteer_Assign,
    PERMISSIONS.Volunteer_Schedule_Manage,
    PERMISSIONS.Volunteer_Schedule_Read,
    PERMISSIONS.Volunteer_Schedule_Confirm,
    PERMISSIONS.Volunteer_Export
  ],
  Dashboard: [
    PERMISSIONS.Dashboard_View,
    PERMISSIONS.Dashboard_Customize,
    PERMISSIONS.Dashboard_Export,
    PERMISSIONS.Report_Generate,
    PERMISSIONS.Report_Read,
    PERMISSIONS.Report_Export,
    PERMISSIONS.Report_Schedule
  ],
  Notifications: [
    PERMISSIONS.Notification_Read,
    PERMISSIONS.Notification_Send,
    PERMISSIONS.Notification_Configure,
    PERMISSIONS.Notification_Template_Manage
  ],
  Administration: [
    PERMISSIONS.User_Create,
    PERMISSIONS.User_Read,
    PERMISSIONS.User_Update,
    PERMISSIONS.User_Delete,
    PERMISSIONS.User_Activate,
    PERMISSIONS.User_Deactivate,
    PERMISSIONS.Role_Manage,
    PERMISSIONS.Permission_Manage,
    PERMISSIONS.Audit_Read,
    PERMISSIONS.Audit_Export,
    PERMISSIONS.Settings_Read,
    PERMISSIONS.Settings_Update,
    PERMISSIONS.Church_Settings_Manage,
    PERMISSIONS.Site_Manage
  ]
};
