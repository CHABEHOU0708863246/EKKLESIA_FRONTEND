
export enum AuditAction {
  Create = 'Create',
  Update = 'Update',
  Delete = 'Delete',
  Login = 'Login',
  Logout = 'Logout',
  Export = 'Export',
  Import = 'Import',
  Validate = 'Validate',
  Reject = 'Reject',
  Approve = 'Approve',
  Cancel = 'Cancel',
  Archive = 'Archive',
  Restore = 'Restore',
  LoginFailed = 'LoginFailed'
}

export enum AuditModule {
  Members = 'Members',
  Finances = 'Finances',
  Events = 'Events',
  Services = 'Services',
  Property = 'Property',
  Communication = 'Communication',
  HR = 'HR',
  Users = 'Users',
  Roles = 'Roles',
  Settings = 'Settings',
  Audit = 'Audit',
  Auth = 'Auth'
}

export enum AuditEntityType {
  Member = 'Member',
  Offering = 'Offering',
  Expense = 'Expense',
  Budget = 'Budget',
  Event = 'Event',
  Service = 'Service',
  Property = 'Property',
  Contract = 'Contract',
  Content = 'Content',
  Employee = 'Employee',
  Volunteer = 'Volunteer',
  User = 'User',
  Role = 'Role'
}

// Labels pour l'affichage
export const AuditActionLabels: Record<AuditAction, string> = {
  [AuditAction.Create]: 'Création',
  [AuditAction.Update]: 'Modification',
  [AuditAction.Delete]: 'Suppression',
  [AuditAction.Login]: 'Connexion',
  [AuditAction.Logout]: 'Déconnexion',
  [AuditAction.Export]: 'Exportation',
  [AuditAction.Import]: 'Importation',
  [AuditAction.Validate]: 'Validation',
  [AuditAction.Reject]: 'Rejet',
  [AuditAction.Approve]: 'Approbation',
  [AuditAction.Cancel]: 'Annulation',
  [AuditAction.Archive]: 'Archivage',
  [AuditAction.Restore]: 'Restauration',
  [AuditAction.LoginFailed]: 'Échec de connexion'
};

export const AuditModuleLabels: Record<AuditModule, string> = {
  [AuditModule.Members]: 'Membres',
  [AuditModule.Finances]: 'Finances',
  [AuditModule.Events]: 'Événements',
  [AuditModule.Services]: 'Cultes',
  [AuditModule.Property]: 'Patrimoine',
  [AuditModule.Communication]: 'Communication',
  [AuditModule.HR]: 'Ressources Humaines',
  [AuditModule.Users]: 'Utilisateurs',
  [AuditModule.Roles]: 'Rôles',
  [AuditModule.Settings]: 'Paramètres',
  [AuditModule.Audit]: 'Audit',
  [AuditModule.Auth]: 'Authentification'
};

export const AuditEntityTypeLabels: Record<AuditEntityType, string> = {
  [AuditEntityType.Member]: 'Membre',
  [AuditEntityType.Offering]: 'Offrande',
  [AuditEntityType.Expense]: 'Dépense',
  [AuditEntityType.Budget]: 'Budget',
  [AuditEntityType.Event]: 'Événement',
  [AuditEntityType.Service]: 'Culte',
  [AuditEntityType.Property]: 'Bien',
  [AuditEntityType.Contract]: 'Contrat',
  [AuditEntityType.Content]: 'Contenu',
  [AuditEntityType.Employee]: 'Employé',
  [AuditEntityType.Volunteer]: 'Bénévole',
  [AuditEntityType.User]: 'Utilisateur',
  [AuditEntityType.Role]: 'Rôle'
};
