
export interface PermissionGroup {
  module: string;
  permissions: PermissionItem[];
}

export interface PermissionItem {
  code: string;
  label: string;
  description?: string;
  category: string;
  isSelected?: boolean;
}

// Permissions prédéfinies par module
export const PERMISSION_MODULES: PermissionGroup[] = [
  {
    module: 'Membres',
    permissions: [
      { code: 'Member_Create', label: 'Créer un membre', category: 'Membres' },
      { code: 'Member_Read', label: 'Lire les membres', category: 'Membres' },
      { code: 'Member_Update', label: 'Modifier un membre', category: 'Membres' },
      { code: 'Member_Delete', label: 'Supprimer un membre', category: 'Membres' },
      { code: 'Member_Validate', label: 'Valider un membre', category: 'Membres' },
      { code: 'Member_Export', label: 'Exporter les membres', category: 'Membres' },
      { code: 'Member_Import', label: 'Importer des membres', category: 'Membres' },
      { code: 'Member_Status_Manage', label: 'Gérer les statuts', category: 'Membres' },
    ]
  },
  {
    module: 'Suivi Pastoral',
    permissions: [
      { code: 'Pastoral_Note_Create', label: 'Créer une note', category: 'Suivi Pastoral' },
      { code: 'Pastoral_Note_Read', label: 'Lire les notes', category: 'Suivi Pastoral' },
      { code: 'Pastoral_Note_Update', label: 'Modifier une note', category: 'Suivi Pastoral' },
      { code: 'Pastoral_Note_Delete', label: 'Supprimer une note', category: 'Suivi Pastoral' },
      { code: 'Pastoral_Note_Export', label: 'Exporter les notes', category: 'Suivi Pastoral' },
      { code: 'Pastoral_Note_View_All', label: 'Voir toutes les notes', category: 'Suivi Pastoral' },
    ]
  },
  {
    module: 'Finances',
    permissions: [
      { code: 'Finance_Offering_Create', label: 'Créer une offrande', category: 'Finances' },
      { code: 'Finance_Offering_Read', label: 'Lire les offrandes', category: 'Finances' },
      { code: 'Finance_Offering_Validate', label: 'Valider une offrande', category: 'Finances' },
      { code: 'Finance_Offering_Export', label: 'Exporter les offrandes', category: 'Finances' },
      { code: 'Finance_Receipt_Generate', label: 'Générer un reçu', category: 'Finances' },
      { code: 'Finance_Expense_Create', label: 'Créer une dépense', category: 'Finances' },
      { code: 'Finance_Expense_Read', label: 'Lire les dépenses', category: 'Finances' },
      { code: 'Finance_Expense_Validate', label: 'Valider une dépense', category: 'Finances' },
      { code: 'Finance_Expense_Approve', label: 'Approuver une dépense', category: 'Finances' },
      { code: 'Finance_Budget_Create', label: 'Créer un budget', category: 'Finances' },
      { code: 'Finance_Budget_Read', label: 'Lire les budgets', category: 'Finances' },
      { code: 'Finance_Budget_Approve', label: 'Approuver un budget', category: 'Finances' },
      { code: 'Finance_Consolidated_View', label: 'Voir consolidé', category: 'Finances' },
      { code: 'Finance_Report_Generate', label: 'Générer un rapport', category: 'Finances' },
    ]
  },
  {
    module: 'Événements',
    permissions: [
      { code: 'Event_Create', label: 'Créer un événement', category: 'Événements' },
      { code: 'Event_Read', label: 'Lire les événements', category: 'Événements' },
      { code: 'Event_Update', label: 'Modifier un événement', category: 'Événements' },
      { code: 'Event_Delete', label: 'Supprimer un événement', category: 'Événements' },
      { code: 'Event_Register', label: 'S\'inscrire à un événement', category: 'Événements' },
      { code: 'Event_Registration_Manage', label: 'Gérer les inscriptions', category: 'Événements' },
      { code: 'Event_Checkin', label: 'Check-in', category: 'Événements' },
      { code: 'Service_Create', label: 'Créer un culte', category: 'Événements' },
      { code: 'Service_Read', label: 'Lire les cultes', category: 'Événements' },
      { code: 'Service_Update', label: 'Modifier un culte', category: 'Événements' },
      { code: 'Service_Attendance_Record', label: 'Enregistrer présence', category: 'Événements' },
    ]
  },
  {
    module: 'Patrimoine',
    permissions: [
      { code: 'Property_Create', label: 'Créer un bien', category: 'Patrimoine' },
      { code: 'Property_Read', label: 'Lire les biens', category: 'Patrimoine' },
      { code: 'Property_Update', label: 'Modifier un bien', category: 'Patrimoine' },
      { code: 'Property_Delete', label: 'Supprimer un bien', category: 'Patrimoine' },
      { code: 'Contract_Create', label: 'Créer un contrat', category: 'Patrimoine' },
      { code: 'Contract_Read', label: 'Lire les contrats', category: 'Patrimoine' },
      { code: 'Contract_Update', label: 'Modifier un contrat', category: 'Patrimoine' },
      { code: 'Contract_Validate', label: 'Valider un contrat', category: 'Patrimoine' },
      { code: 'Contract_Terminate', label: 'Résilier un contrat', category: 'Patrimoine' },
      { code: 'Maintenance_Report', label: 'Signaler maintenance', category: 'Patrimoine' },
      { code: 'Maintenance_Manage', label: 'Gérer maintenance', category: 'Patrimoine' },
    ]
  },
  {
    module: 'Ressources Humaines',
    permissions: [
      { code: 'Employee_Create', label: 'Créer un employé', category: 'RH' },
      { code: 'Employee_Read', label: 'Lire les employés', category: 'RH' },
      { code: 'Employee_Update', label: 'Modifier un employé', category: 'RH' },
      { code: 'Employee_Delete', label: 'Supprimer un employé', category: 'RH' },
      { code: 'Payroll_Calculate', label: 'Calculer paie', category: 'RH' },
      { code: 'Payroll_Read', label: 'Lire les paies', category: 'RH' },
      { code: 'Leave_Manage', label: 'Gérer congés', category: 'RH' },
      { code: 'Leave_Approve', label: 'Approuver congés', category: 'RH' },
      { code: 'Volunteer_Create', label: 'Créer un bénévole', category: 'RH' },
      { code: 'Volunteer_Read', label: 'Lire les bénévoles', category: 'RH' },
      { code: 'Volunteer_Update', label: 'Modifier un bénévole', category: 'RH' },
      { code: 'Volunteer_Schedule_Manage', label: 'Gérer planning', category: 'RH' },
    ]
  },
  {
    module: 'Administration',
    permissions: [
      { code: 'User_Create', label: 'Créer un utilisateur', category: 'Administration' },
      { code: 'User_Read', label: 'Lire les utilisateurs', category: 'Administration' },
      { code: 'User_Update', label: 'Modifier un utilisateur', category: 'Administration' },
      { code: 'User_Delete', label: 'Supprimer un utilisateur', category: 'Administration' },
      { code: 'User_Activate', label: 'Activer un utilisateur', category: 'Administration' },
      { code: 'User_Deactivate', label: 'Désactiver un utilisateur', category: 'Administration' },
      { code: 'Role_Manage', label: 'Gérer les rôles', category: 'Administration' },
      { code: 'Permission_Manage', label: 'Gérer les permissions', category: 'Administration' },
      { code: 'Audit_Read', label: 'Lire les logs d\'audit', category: 'Administration' },
      { code: 'Audit_Export', label: 'Exporter les logs', category: 'Administration' },
      { code: 'Settings_Update', label: 'Modifier les paramètres', category: 'Administration' },
      { code: 'Site_Manage', label: 'Gérer les sites', category: 'Administration' },
    ]
  },
  {
    module: 'Communication',
    permissions: [
      { code: 'Content_Create', label: 'Créer un contenu', category: 'Communication' },
      { code: 'Content_Read', label: 'Lire les contenus', category: 'Communication' },
      { code: 'Content_Update', label: 'Modifier un contenu', category: 'Communication' },
      { code: 'Content_Delete', label: 'Supprimer un contenu', category: 'Communication' },
      { code: 'Content_Publish', label: 'Publier un contenu', category: 'Communication' },
      { code: 'Communication_Broadcast', label: 'Diffuser un message', category: 'Communication' },
      { code: 'Communication_Newsletter', label: 'Gérer les newsletters', category: 'Communication' },
    ]
  }
];

// Classe utilitaire
export class PermissionUtils {
  static getAllPermissionCodes(): string[] {
    const codes: string[] = [];
    PERMISSION_MODULES.forEach(group => {
      group.permissions.forEach(p => codes.push(p.code));
    });
    return codes;
  }

  static getPermissionLabel(code: string): string {
    for (const group of PERMISSION_MODULES) {
      const found = group.permissions.find(p => p.code === code);
      if (found) return found.label;
    }
    return code;
  }

  static getPermissionCategory(code: string): string {
    for (const group of PERMISSION_MODULES) {
      const found = group.permissions.find(p => p.code === code);
      if (found) return found.category;
    }
    return 'Autre';
  }

  static getModuleForPermission(code: string): string {
    for (const group of PERMISSION_MODULES) {
      const found = group.permissions.find(p => p.code === code);
      if (found) return group.module;
    }
    return 'Autre';
  }

  static getPermissionsByModule(module: string): PermissionItem[] {
    const group = PERMISSION_MODULES.find(g => g.module === module);
    return group ? group.permissions : [];
  }

  static getSelectedPermissions(permissions: string[], module: string): PermissionItem[] {
    const group = PERMISSION_MODULES.find(g => g.module === module);
    if (!group) return [];
    return group.permissions.filter(p => permissions.includes(p.code));
  }

  static groupPermissionsByModule(permissions: string[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {};
    permissions.forEach(code => {
      const module = this.getModuleForPermission(code);
      if (!groups[module]) groups[module] = [];
      groups[module].push(code);
    });
    return groups;
  }

  static getModuleIcon(module: string): string {
    const icons: Record<string, string> = {
      'Membres': 'fa-users',
      'Suivi Pastoral': 'fa-praying-hands',
      'Finances': 'fa-coins',
      'Événements': 'fa-calendar-alt',
      'Patrimoine': 'fa-building',
      'Ressources Humaines': 'fa-user-cog',
      'Administration': 'fa-shield-alt',
      'Communication': 'fa-bullhorn'
    };
    return icons[module] || 'fa-cube';
  }
}
