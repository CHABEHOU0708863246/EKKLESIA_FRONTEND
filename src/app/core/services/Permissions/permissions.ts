import { Injectable } from '@angular/core';
import { Token } from '../Token/token';

export interface PermissionInfo {
  code: string;
  module: string;
  displayName: string;
  isRead: boolean;
  isWrite: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class Permissions {

  private userPermissions: string[] = [];
  private userRoles: string[] = [];

  // Constantes pour les modules
  private readonly MODULES = {
    MEMBERS: 'Membres',
    PASTORAL: 'Suivi Pastoral',
    CELLS: 'Cellules',
    FINANCES: 'Finances',
    EVENTS: 'Événements',
    PROPERTY: 'Patrimoine',
    COMMUNICATION: 'Communication',
    HR: 'Ressources Humaines',
    DASHBOARD: 'Tableau de Bord',
    NOTIFICATIONS: 'Notifications',
    ADMINISTRATION: 'Administration'
  };

  constructor(private tokenService: Token) {
    this.loadUserPermissions();
  }

  /**
   * Charge les permissions depuis le token JWT
   */
private loadUserPermissions(): void {
  const payload = this.tokenService.getPayload();

  if (!payload) {
    this.userPermissions = [];
    this.userRoles = [];
    return;
  }

  console.log('🔍 Payload JWT brut:', payload); // ← à retirer après debug

  this.userPermissions = this.extractPermissions(payload);
  this.userRoles = this.extractRoles(payload);

  console.log('✅ Permissions extraites:', this.userPermissions); // ← à retirer après debug
}

  /**
   * Extrait les permissions du payload JWT
   */
  private extractPermissions(payload: any): string[] {
  const permissions: string[] = [];

  // 1. Claim exact du token EKKLESIA : "Permission" (P majuscule, singulier)
  if (payload.Permission) {
    if (Array.isArray(payload.Permission)) {
      permissions.push(...payload.Permission);
    } else if (typeof payload.Permission === 'string') {
      permissions.push(payload.Permission);
    }
  }

  // 2. Permissions directes (variante minuscule, au cas où le back évolue)
  if (payload.permissions && Array.isArray(payload.permissions)) {
    permissions.push(...payload.permissions);
  }

  // 3. Claims de permissions namespacé Microsoft
  const permClaims = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/permissions'];
  if (permClaims) {
    if (Array.isArray(permClaims)) {
      permissions.push(...permClaims);
    } else if (typeof permClaims === 'string') {
      permissions.push(permClaims);
    }
  }

  // 4. Permission claim (singulier, minuscule)
  if (payload.permission) {
    if (Array.isArray(payload.permission)) {
      permissions.push(...payload.permission);
    } else if (typeof payload.permission === 'string') {
      permissions.push(payload.permission);
    }
  }

  return [...new Set(permissions)];
}



  /**
   * Extrait les rôles du payload JWT
   */
  private extractRoles(payload: any): string[] {
    const roles: string[] = [];

    // 1. Role direct
    if (payload.role) {
      if (Array.isArray(payload.role)) {
        roles.push(...payload.role);
      } else if (typeof payload.role === 'string') {
        roles.push(payload.role);
      }
    }

    // 2. Claims de rôle
    const roleClaims = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
    if (roleClaims) {
      if (Array.isArray(roleClaims)) {
        roles.push(...roleClaims);
      } else if (typeof roleClaims === 'string') {
        roles.push(roleClaims);
      }
    }

    return [...new Set(roles)];
  }

  /**
   * Recharge les permissions (après login par exemple)
   */
  public reloadPermissions(): void {
    this.loadUserPermissions();
  }

// ───────────────────────────────────────────────────────────────
  // 🧩 AGRÉGATEURS DE MODULE (visibilité de section dans le sidebar)
  // ───────────────────────────────────────────────────────────────
  // Principe : une section n'est visible QUE si l'utilisateur a
  // accès à AU MOINS UNE fonctionnalité qu'elle contient.
  // Chaque lien individuel reste ensuite filtré par sa permission
  // précise (Member_Create, Cell_Read, etc.) — pas de raccourci.

  /**
   * Section "Membres" : annuaire, création, pipeline, suivi pastoral,
   * cellules, import.
   */
  public canAccessMemberModule(): boolean {
    return this.hasAnyPermission(
      'Member_Read', 'Member_Create', 'Member_Update', 'Member_Delete', 'Member_Validate',
      'Member_Export', 'Member_Import',
      'Pastoral_Note_Read', 'Pastoral_Note_Create', 'Pastoral_Note_Update', 'Pastoral_Note_Delete',
      'Cell_Read', 'Cell_Create', 'Cell_Update', 'Cell_Delete', 'Cell_Assign'
    );
  }

  /**
   * Section "Communauté" : disponibilités et planning des bénévoles.
   */
  public canAccessCommunityModule(): boolean {
    return this.hasAnyPermission(
      'Volunteer_Schedule_Read', 'Volunteer_Schedule_Manage', 'Volunteer_Schedule_Confirm'
    );
  }

  /**
   * Section "Vie d'église" : cultes, événements, rendez-vous pastoraux.
   */
  public canAccessChurchLifeModule(): boolean {
    return this.hasAnyPermission(
      'Service_Read', 'Service_Create', 'Service_Update', 'Service_Attendance_Read', 'Service_Attendance_Record',
      'Event_Read', 'Event_Create', 'Event_Update', 'Event_Delete', 'Event_Register', 'Event_Registration_Manage',
      'Pastoral_Appointment_Manage'
    );
  }

  /**
   * Sous-section "Événements" seule (utile pour un affichage plus fin
   * si besoin de dissocier de Cultes/Rendez-vous).
   */
  public canAccessEventModule(): boolean {
    return this.hasAnyPermission(
      'Event_Read', 'Event_Create', 'Event_Update', 'Event_Delete',
      'Event_Register', 'Event_Registration_Manage'
    );
  }

  /**
   * Section "Finances" : offrandes, dépenses, budget, consolidation.
   */
  public canAccessFinanceModule(): boolean {
    return this.hasAnyPermission(
      'Finance_Offering_Read', 'Finance_Offering_Create', 'Finance_Offering_Validate',
      'Finance_Expense_Read', 'Finance_Expense_Create', 'Finance_Expense_Validate', 'Finance_Expense_Approve',
      'Finance_Budget_Read', 'Finance_Budget_Create', 'Finance_Budget_Update', 'Finance_Budget_Approve',
      'Finance_Consolidated_View'
    );
  }

  /**
   * Section "Patrimoine & Communication" : biens, contrats, maintenance,
   * contenus, médias.
   */
  public canAccessPropertyModule(): boolean {
    return this.hasAnyPermission(
      'Property_Read', 'Property_Create', 'Property_Update', 'Property_Delete',
      'Contract_Read', 'Contract_Create', 'Contract_Update', 'Contract_Validate',
      'Maintenance_Report', 'Maintenance_Manage'
    );
  }

  public canAccessCommunicationModule(): boolean {
    return this.hasAnyPermission(
      'Content_Read', 'Content_Create', 'Content_Update', 'Content_Delete', 'Content_Publish',
      'Communication_Broadcast', 'Communication_Newsletter'
    );
  }

  /**
   * Section "Ressources Humaines" : employés, bénévoles.
   */
  public canAccessHRModule(): boolean {
    return this.hasAnyPermission(
      'Employee_Read', 'Employee_Create', 'Employee_Update', 'Employee_Delete',
      'Payroll_Read', 'Payroll_Calculate', 'Leave_Manage', 'Leave_Approve',
      'Volunteer_Read', 'Volunteer_Create', 'Volunteer_Update', 'Volunteer_Delete', 'Volunteer_Assign'
    );
  }

  /**
   * Section "Administration" : utilisateurs, rôles, permissions,
   * audit, paramètres généraux/église/sites, notifications système.
   * ⚠️ Ne couvre QUE l'administration — jamais "Mon profil", qui est
   * accessible à tout utilisateur connecté indépendamment de ceci.
   */
  public canAccessAdministrationModule(): boolean {
    return this.hasAnyPermission(
      'User_Read', 'User_Create', 'User_Update', 'User_Delete', 'User_Activate', 'User_Deactivate',
      'Role_Manage', 'Permission_Manage',
      'Audit_Read', 'Audit_Export',
      'Settings_Read', 'Settings_Update', 'Church_Settings_Manage', 'Site_Manage',
      'Notification_Configure', 'Notification_Template_Manage'
    );
  }

  // ───────────────────────────────────────────────────────────────
  // MÉTHODES DE BASE
  // ───────────────────────────────────────────────────────────────

  /**
 * Vérifie si l'utilisateur a UNE permission spécifique
 * SUPER_ADMIN et PASTOR_PRINCIPAL ont un bypass total (miroir du backend)
 */
  public hasPermission(permission: string): boolean {
    if (this.isSuperAdmin() || this.isPastorPrincipal()) {
      return true;
    }
    return this.userPermissions.includes(permission);
  }

  /**
 * Vérifie si l'utilisateur a AU MOINS UNE des permissions
 */
  public hasAnyPermission(...permissions: string[]): boolean {
    if (this.isSuperAdmin() || this.isPastorPrincipal()) {
      return true;
    }
    return permissions.some(p => this.userPermissions.includes(p));
  }

  /**
 * Vérifie si l'utilisateur a TOUTES les permissions
 */
  public hasAllPermissions(...permissions: string[]): boolean {
    if (this.isSuperAdmin() || this.isPastorPrincipal()) {
      return true;
    }
    return permissions.every(p => this.userPermissions.includes(p));
  }

    public clearPermissions(): void {
      this.userPermissions = [];
      this.userRoles = [];
    }

  /**
   * Vérifie si l'utilisateur a un rôle spécifique
   */
  public hasRole(role: string): boolean {
    return this.userRoles.some(r =>
      r.toUpperCase() === role.toUpperCase() ||
      r === role
    );
  }

  /**
   * Vérifie si l'utilisateur a AU MOINS UN des rôles
   */
  public hasAnyRole(...roles: string[]): boolean {
    return roles.some(role => this.hasRole(role));
  }

  // ───────────────────────────────────────────────────────────────
  // RÔLES SPÉCIAUX
  // ───────────────────────────────────────────────────────────────

  /**
   * Vérifie si l'utilisateur est Super Admin
   */
  public isSuperAdmin(): boolean {
    return this.hasRole('SUPER_ADMIN') ||
           this.hasRole('SUPER ADMINISTRATEUR') ||
           this.hasRole('Super Administrateur');
  }

  /**
   * Vérifie si l'utilisateur est Pasteur Principal
   */
  public isPastorPrincipal(): boolean {
    return this.hasRole('PASTOR_PRINCIPAL') ||
           this.hasRole('Pasteur Principal');
  }

  /**
   * Vérifie si l'utilisateur est Pasteur de Site
   */
  public isPasteurSite(): boolean {
    return this.hasRole('PASTEUR_SITE') ||
           this.hasRole('Pasteur de Site');
  }

  /**
   * Vérifie si l'utilisateur est Administrateur ou supérieur
   */
  public isAdminOrAbove(): boolean {
    return this.isSuperAdmin() ||
           this.isPastorPrincipal() ||
           this.hasRole('ADMIN') ||
           this.hasRole('Administrateur');
  }

  // ───────────────────────────────────────────────────────────────
  // 👥 MODULE : MEMBRES
  // ───────────────────────────────────────────────────────────────

  public canManageMembers(): boolean {
    return this.hasAnyPermission(
      'Member_Create',
      'Member_Read',
      'Member_Update',
      'Member_Delete',
      'Member_Validate'
    );
  }



  public canViewMembers(): boolean {
    return this.hasAnyPermission(
      'Member_Read',
      'Member_Update',
      'Member_Create',
      'Member_Validate'
    );
  }

  public canCreateMember(): boolean {
    return this.hasPermission('Member_Create');
  }

  public canUpdateMember(): boolean {
    return this.hasPermission('Member_Update');
  }

  public canDeleteMember(): boolean {
    return this.hasPermission('Member_Delete');
  }

  public canValidateMember(): boolean {
    return this.hasPermission('Member_Validate');
  }

  public canExportMembers(): boolean {
    return this.hasPermission('Member_Export');
  }

  public canImportMembers(): boolean {
    return this.hasPermission('Member_Import');
  }

  public canManageMemberStatus(): boolean {
    return this.hasPermission('Member_Status_Manage');
  }

  public canViewMemberHistory(): boolean {
    return this.hasPermission('Member_History_View');
  }

  public canManageFamily(): boolean {
    return this.hasPermission('Member_Family_Manage');
  }

  public canGenerateMemberReport(): boolean {
    return this.hasPermission('Member_Report_Generate');
  }

  // ───────────────────────────────────────────────────────────────
  // 🙏 MODULE : SUIVI PASTORAL
  // ───────────────────────────────────────────────────────────────

  public canManagePastoralNotes(): boolean {
    return this.hasAnyPermission(
      'Pastoral_Note_Create',
      'Pastoral_Note_Read',
      'Pastoral_Note_Update',
      'Pastoral_Note_Delete'
    );
  }

  public canViewPastoralNotes(): boolean {
    return this.hasAnyPermission(
      'Pastoral_Note_Read',
      'Pastoral_Note_Create',
      'Pastoral_Note_Update'
    );
  }

  public canCreatePastoralNote(): boolean {
    return this.hasPermission('Pastoral_Note_Create');
  }

  public canUpdatePastoralNote(): boolean {
    return this.hasPermission('Pastoral_Note_Update');
  }

  public canDeletePastoralNote(): boolean {
    return this.hasPermission('Pastoral_Note_Delete');
  }

  public canViewAllPastoralNotes(): boolean {
    return this.hasPermission('Pastoral_Note_View_All');
  }

  public canManageAppointments(): boolean {
    return this.hasPermission('Pastoral_Appointment_Manage');
  }

  public canManagePrayers(): boolean {
    return this.hasPermission('Pastoral_Prayer_Manage');
  }

  public canGeneratePastoralReport(): boolean {
    return this.hasPermission('Pastoral_Report_Generate');
  }

  // ───────────────────────────────────────────────────────────────
  // 🏠 MODULE : CELLULES
  // ───────────────────────────────────────────────────────────────

  public canManageCells(): boolean {
    return this.hasAnyPermission(
      'Cell_Create',
      'Cell_Read',
      'Cell_Update',
      'Cell_Delete',
      'Cell_Assign'
    );
  }

  public canViewCells(): boolean {
    return this.hasAnyPermission(
      'Cell_Read',
      'Cell_Update',
      'Cell_Create'
    );
  }

  public canCreateCell(): boolean {
    return this.hasPermission('Cell_Create');
  }

  public canUpdateCell(): boolean {
    return this.hasPermission('Cell_Update');
  }

  public canDeleteCell(): boolean {
    return this.hasPermission('Cell_Delete');
  }

  public canAssignToCell(): boolean {
    return this.hasPermission('Cell_Assign');
  }

  public canViewCellAttendance(): boolean {
    return this.hasPermission('Cell_Attendance_Read');
  }

  public canManageCellAttendance(): boolean {
    return this.hasPermission('Cell_Attendance_Update');
  }

  public canSubmitCellReport(): boolean {
    return this.hasPermission('Cell_Report_Submit');
  }

  public canManageCellLeaders(): boolean {
    return this.hasPermission('Cell_Leader_Manage');
  }

  // ───────────────────────────────────────────────────────────────
  // 💰 MODULE : FINANCES
  // ───────────────────────────────────────────────────────────────

  public canManageFinances(): boolean {
    return this.hasAnyPermission(
      'Finance_Offering_Read',
      'Finance_Expense_Read',
      'Finance_Budget_Read'
    );
  }

  // Offrandes
  public canViewOfferings(): boolean {
    return this.hasAnyPermission(
      'Finance_Offering_Read',
      'Finance_Offering_Create',
      'Finance_Offering_Validate'
    );
  }

  public canCreateOffering(): boolean {
    return this.hasPermission('Finance_Offering_Create');
  }

  public canValidateOffering(): boolean {
    return this.hasPermission('Finance_Offering_Validate');
  }

  public canGenerateReceipt(): boolean {
    return this.hasPermission('Finance_Receipt_Generate');
  }

  public canExportOfferings(): boolean {
    return this.hasPermission('Finance_Offering_Export');
  }

  // Dépenses
  public canViewExpenses(): boolean {
    return this.hasAnyPermission(
      'Finance_Expense_Read',
      'Finance_Expense_Create',
      'Finance_Expense_Validate'
    );
  }

  public canCreateExpense(): boolean {
    return this.hasPermission('Finance_Expense_Create');
  }

  public canValidateExpense(): boolean {
    return this.hasPermission('Finance_Expense_Validate');
  }

  public canApproveExpense(): boolean {
    return this.hasPermission('Finance_Expense_Approve');
  }

  public canExportExpenses(): boolean {
    return this.hasPermission('Finance_Expense_Export');
  }

  // Budget
  public canViewBudgets(): boolean {
    return this.hasAnyPermission(
      'Finance_Budget_Read',
      'Finance_Budget_Create',
      'Finance_Budget_Update'
    );
  }

  public canCreateBudget(): boolean {
    return this.hasPermission('Finance_Budget_Create');
  }

  public canUpdateBudget(): boolean {
    return this.hasPermission('Finance_Budget_Update');
  }

  public canApproveBudget(): boolean {
    return this.hasPermission('Finance_Budget_Approve');
  }

  public canFollowBudget(): boolean {
    return this.hasPermission('Finance_Budget_Follow');
  }

  // Consolidation & Rapports
  public canViewConsolidated(): boolean {
    return this.hasPermission('Finance_Consolidated_View');
  }

  public canGenerateFinanceReport(): boolean {
    return this.hasPermission('Finance_Report_Generate');
  }

  public canExportFinanceReport(): boolean {
    return this.hasPermission('Finance_Report_Export');
  }

  public canManageBankAccounts(): boolean {
    return this.hasPermission('Finance_Bank_Manage');
  }

  public canMakeTransfers(): boolean {
    return this.hasPermission('Finance_Transfer_Make');
  }

  // ───────────────────────────────────────────────────────────────
  // 📅 MODULE : ÉVÉNEMENTS & CULTES
  // ───────────────────────────────────────────────────────────────

  public canManageEvents(): boolean {
    return this.hasAnyPermission(
      'Event_Create',
      'Event_Read',
      'Event_Update',
      'Event_Delete'
    );
  }

  public canViewEvents(): boolean {
    return this.hasAnyPermission(
      'Event_Read',
      'Event_Update',
      'Event_Create'
    );
  }

  public canCreateEvent(): boolean {
    return this.hasPermission('Event_Create');
  }

  public canUpdateEvent(): boolean {
    return this.hasPermission('Event_Update');
  }

  public canDeleteEvent(): boolean {
    return this.hasPermission('Event_Delete');
  }

  public canRegisterToEvent(): boolean {
    return this.hasPermission('Event_Register');
  }

  public canManageEventRegistrations(): boolean {
    return this.hasPermission('Event_Registration_Manage');
  }

  public canCheckinEvent(): boolean {
    return this.hasPermission('Event_Checkin');
  }

  public canManageEventPayments(): boolean {
    return this.hasPermission('Event_Payment_Manage');
  }

  // Cultes
  public canManageServices(): boolean {
    return this.hasAnyPermission(
      'Service_Create',
      'Service_Read',
      'Service_Update'
    );
  }

  public canViewServices(): boolean {
    return this.hasAnyPermission(
      'Service_Read',
      'Service_Update',
      'Service_Create'
    );
  }

  public canCreateService(): boolean {
    return this.hasPermission('Service_Create');
  }

  public canUpdateService(): boolean {
    return this.hasPermission('Service_Update');
  }

  public canRecordServiceAttendance(): boolean {
    return this.hasPermission('Service_Attendance_Record');
  }

  public canViewServiceAttendance(): boolean {
    return this.hasPermission('Service_Attendance_Read');
  }

  public canManageServicePlanning(): boolean {
    return this.hasPermission('Service_Planning_Manage');
  }

  public canManageServiceTeam(): boolean {
    return this.hasPermission('Service_Team_Manage');
  }

  // ───────────────────────────────────────────────────────────────
  // 🏢 MODULE : PATRIMOINE
  // ───────────────────────────────────────────────────────────────

  public canManageProperties(): boolean {
    return this.hasAnyPermission(
      'Property_Create',
      'Property_Read',
      'Property_Update',
      'Property_Delete'
    );
  }

  public canViewProperties(): boolean {
    return this.hasAnyPermission(
      'Property_Read',
      'Property_Update',
      'Property_Create'
    );
  }

  public canCreateProperty(): boolean {
    return this.hasPermission('Property_Create');
  }

  public canUpdateProperty(): boolean {
    return this.hasPermission('Property_Update');
  }

  public canDeleteProperty(): boolean {
    return this.hasPermission('Property_Delete');
  }

  // Contrats
  public canManageContracts(): boolean {
    return this.hasAnyPermission(
      'Contract_Create',
      'Contract_Read',
      'Contract_Update',
      'Contract_Validate'
    );
  }

  public canViewContracts(): boolean {
    return this.hasAnyPermission(
      'Contract_Read',
      'Contract_Update',
      'Contract_Create'
    );
  }

  public canCreateContract(): boolean {
    return this.hasPermission('Contract_Create');
  }

  public canUpdateContract(): boolean {
    return this.hasPermission('Contract_Update');
  }

  public canValidateContract(): boolean {
    return this.hasPermission('Contract_Validate');
  }

  public canTerminateContract(): boolean {
    return this.hasPermission('Contract_Terminate');
  }

  public canRenewContract(): boolean {
    return this.hasPermission('Contract_Renew');
  }

  // Maintenance
  public canReportMaintenance(): boolean {
    return this.hasPermission('Maintenance_Report');
  }

  public canManageMaintenance(): boolean {
    return this.hasPermission('Maintenance_Manage');
  }

  public canAssignMaintenance(): boolean {
    return this.hasPermission('Maintenance_Assign');
  }

  public canCompleteMaintenance(): boolean {
    return this.hasPermission('Maintenance_Complete');
  }

  public canManageInsurance(): boolean {
    return this.hasPermission('Insurance_Manage');
  }

  // ───────────────────────────────────────────────────────────────
  // 📢 MODULE : COMMUNICATION
  // ───────────────────────────────────────────────────────────────

  public canManageContent(): boolean {
    return this.hasAnyPermission(
      'Content_Create',
      'Content_Read',
      'Content_Update',
      'Content_Delete'
    );
  }

  public canViewContent(): boolean {
    return this.hasAnyPermission(
      'Content_Read',
      'Content_Update',
      'Content_Create'
    );
  }

  public canCreateContent(): boolean {
    return this.hasPermission('Content_Create');
  }

  public canUpdateContent(): boolean {
    return this.hasPermission('Content_Update');
  }

  public canDeleteContent(): boolean {
    return this.hasPermission('Content_Delete');
  }

  public canPublishContent(): boolean {
    return this.hasPermission('Content_Publish');
  }

  public canArchiveContent(): boolean {
    return this.hasPermission('Content_Archive');
  }

  public canBroadcast(): boolean {
    return this.hasPermission('Communication_Broadcast');
  }

  public canManageNewsletter(): boolean {
    return this.hasPermission('Communication_Newsletter');
  }

  public canManageCommunicationTemplates(): boolean {
    return this.hasPermission('Communication_Template_Manage');
  }

  public canPlanCommunication(): boolean {
    return this.hasPermission('Communication_Plan');
  }

  public canViewCommunicationStats(): boolean {
    return this.hasPermission('Communication_Stats_View');
  }

  public canManageSms(): boolean {
    return this.hasPermission('Communication_Sms_Manage');
  }

  public canManageEmails(): boolean {
    return this.hasPermission('Communication_Email_Manage');
  }

  // ───────────────────────────────────────────────────────────────
  // 👤 MODULE : RESSOURCES HUMAINES
  // ───────────────────────────────────────────────────────────────

  public canManageEmployees(): boolean {
    return this.hasAnyPermission(
      'Employee_Create',
      'Employee_Read',
      'Employee_Update',
      'Employee_Delete'
    );
  }

  public canViewEmployees(): boolean {
    return this.hasAnyPermission(
      'Employee_Read',
      'Employee_Update',
      'Employee_Create'
    );
  }

  public canCreateEmployee(): boolean {
    return this.hasPermission('Employee_Create');
  }

  public canUpdateEmployee(): boolean {
    return this.hasPermission('Employee_Update');
  }

  public canDeleteEmployee(): boolean {
    return this.hasPermission('Employee_Delete');
  }

  public canExportEmployees(): boolean {
    return this.hasPermission('Employee_Export');
  }

  public canManagePayroll(): boolean {
    return this.hasPermission('Payroll_Calculate');
  }

  public canViewPayroll(): boolean {
    return this.hasPermission('Payroll_Read');
  }

  public canExportPayroll(): boolean {
    return this.hasPermission('Payroll_Export');
  }

  public canManageLeave(): boolean {
    return this.hasPermission('Leave_Manage');
  }

  public canApproveLeave(): boolean {
    return this.hasPermission('Leave_Approve');
  }

  // Bénévoles
  public canManageVolunteers(): boolean {
    return this.hasAnyPermission(
      'Volunteer_Create',
      'Volunteer_Read',
      'Volunteer_Update',
      'Volunteer_Delete'
    );
  }

  public canViewVolunteers(): boolean {
    return this.hasAnyPermission(
      'Volunteer_Read',
      'Volunteer_Update',
      'Volunteer_Create'
    );
  }

  public canCreateVolunteer(): boolean {
    return this.hasPermission('Volunteer_Create');
  }

  public canUpdateVolunteer(): boolean {
    return this.hasPermission('Volunteer_Update');
  }

  public canDeleteVolunteer(): boolean {
    return this.hasPermission('Volunteer_Delete');
  }

  public canAssignVolunteer(): boolean {
    return this.hasPermission('Volunteer_Assign');
  }

  public canManageVolunteerSchedule(): boolean {
    return this.hasPermission('Volunteer_Schedule_Manage');
  }

  public canViewVolunteerSchedule(): boolean {
    return this.hasPermission('Volunteer_Schedule_Read');
  }

  public canConfirmVolunteerSchedule(): boolean {
    return this.hasPermission('Volunteer_Schedule_Confirm');
  }

  // ───────────────────────────────────────────────────────────────
  // 📈 MODULE : TABLEAU DE BORD & RAPPORTS
  // ───────────────────────────────────────────────────────────────

  public canViewDashboard(): boolean {
    return this.hasPermission('Dashboard_View');
  }

  public canCustomizeDashboard(): boolean {
    return this.hasPermission('Dashboard_Customize');
  }

  public canExportDashboard(): boolean {
    return this.hasPermission('Dashboard_Export');
  }

  public canGenerateReport(): boolean {
    return this.hasPermission('Report_Generate');
  }

  public canViewReports(): boolean {
    return this.hasAnyPermission(
      'Report_Read',
      'Report_Generate',
      'Report_Export'
    );
  }

  public canExportReport(): boolean {
    return this.hasPermission('Report_Export');
  }

  public canScheduleReport(): boolean {
    return this.hasPermission('Report_Schedule');
  }

  public canViewAnalytics(): boolean {
    return this.hasAnyPermission(
      'Dashboard_View',
      'Report_Generate',
      'Report_Read',
      'Finance_Report_Generate',
      'Member_Report_Generate'
    );
  }

  // ───────────────────────────────────────────────────────────────
  // 🔔 MODULE : NOTIFICATIONS
  // ───────────────────────────────────────────────────────────────

  public canViewNotifications(): boolean {
    return this.hasPermission('Notification_Read');
  }

  public canSendNotifications(): boolean {
    return this.hasPermission('Notification_Send');
  }

  public canConfigureNotifications(): boolean {
    return this.hasPermission('Notification_Configure');
  }

  public canManageNotificationTemplates(): boolean {
    return this.hasPermission('Notification_Template_Manage');
  }

  // ───────────────────────────────────────────────────────────────
  // 🏛️ MODULE : ADMINISTRATION
  // ───────────────────────────────────────────────────────────────

  public canManageUsers(): boolean {
    return this.hasAnyPermission(
      'User_Create',
      'User_Read',
      'User_Update',
      'User_Delete',
      'User_Activate',
      'User_Deactivate'
    );
  }

  public canViewUsers(): boolean {
    return this.hasAnyPermission(
      'User_Read',
      'User_Update',
      'User_Create'
    );
  }

  public canCreateUser(): boolean {
    return this.hasPermission('User_Create');
  }

  public canUpdateUser(): boolean {
    return this.hasPermission('User_Update');
  }

  public canDeleteUser(): boolean {
    return this.hasPermission('User_Delete');
  }

  public canActivateUser(): boolean {
    return this.hasPermission('User_Activate');
  }

  public canDeactivateUser(): boolean {
    return this.hasPermission('User_Deactivate');
  }

  public canManageRoles(): boolean {
    return this.hasPermission('Role_Manage');
  }

  public canManagePermissions(): boolean {
    return this.hasPermission('Permission_Manage');
  }

  public canViewAdministration(): boolean {
    return this.hasAnyPermission(
      'User_Read',
      'Role_Manage',
      'Settings_Read',
      'Audit_Read'
    );
  }

  // Audit
  public canViewAudit(): boolean {
    return this.hasPermission('Audit_Read');
  }

  public canExportAudit(): boolean {
    return this.hasPermission('Audit_Export');
  }

  // Paramètres
  public canViewSettings(): boolean {
    return this.hasPermission('Settings_Read');
  }

  public canUpdateSettings(): boolean {
    return this.hasPermission('Settings_Update');
  }

  public canManageChurchSettings(): boolean {
    return this.hasPermission('Church_Settings_Manage');
  }

  public canManageSites(): boolean {
    return this.hasPermission('Site_Manage');
  }

  // ───────────────────────────────────────────────────────────────
  // MÉTHODES UTILITAIRES
  // ───────────────────────────────────────────────────────────────

  /**
   * Obtient toutes les permissions de l'utilisateur
   */
  public getUserPermissions(): string[] {
    return [...this.userPermissions];
  }

  /**
   * Obtient tous les rôles de l'utilisateur
   */
  public getUserRoles(): string[] {
    return [...this.userRoles];
  }

  /**
   * Vérifie si l'utilisateur a accès à un module
   */
  public hasAccessToModule(module: string): boolean {
    const modulePermissions: Record<string, string[]> = {
      [this.MODULES.MEMBERS]: ['Member_Read', 'Member_Create', 'Member_Update'],
      [this.MODULES.PASTORAL]: ['Pastoral_Note_Read', 'Pastoral_Note_Create'],
      [this.MODULES.CELLS]: ['Cell_Read', 'Cell_Create', 'Cell_Update'],
      [this.MODULES.FINANCES]: ['Finance_Offering_Read', 'Finance_Expense_Read', 'Finance_Budget_Read'],
      [this.MODULES.EVENTS]: ['Event_Read', 'Service_Read'],
      [this.MODULES.PROPERTY]: ['Property_Read', 'Contract_Read'],
      [this.MODULES.COMMUNICATION]: ['Content_Read'],
      [this.MODULES.HR]: ['Employee_Read', 'Volunteer_Read'],
      [this.MODULES.DASHBOARD]: ['Dashboard_View'],
      [this.MODULES.NOTIFICATIONS]: ['Notification_Read'],
      [this.MODULES.ADMINISTRATION]: ['User_Read', 'Audit_Read']
    };

    const perms = modulePermissions[module] || [];
    return this.hasAnyPermission(...perms);
  }

  /**
   * Retourne les permissions par module
   */
  public getPermissionsByModule(): { module: string; permissions: string[] }[] {
    const modules = [
      this.MODULES.MEMBERS,
      this.MODULES.PASTORAL,
      this.MODULES.CELLS,
      this.MODULES.FINANCES,
      this.MODULES.EVENTS,
      this.MODULES.PROPERTY,
      this.MODULES.COMMUNICATION,
      this.MODULES.HR,
      this.MODULES.DASHBOARD,
      this.MODULES.NOTIFICATIONS,
      this.MODULES.ADMINISTRATION
    ];

    return modules.map(module => ({
      module,
      permissions: this.userPermissions.filter(p =>
        p.startsWith(module.replace(/\s/g, '_')) ||
        p.includes(module)
      )
    }));
  }

  /**
   * Vérifie si l'utilisateur a accès à une route
   */
  public canActivateRoute(requiredPermissions: string[], requiredRoles: string[] = []): boolean {
    // Si la route nécessite des rôles
    if (requiredRoles.length > 0) {
      const hasRole = this.hasAnyRole(...requiredRoles);
      if (!hasRole) {
        // Si l'utilisateur n'a pas les rôles requis, vérifier les permissions
        if (requiredPermissions.length === 0) {
          return false;
        }
      } else {
        // Si l'utilisateur a un rôle requis, il a accès (sauf si des permissions spécifiques sont requises)
        if (requiredPermissions.length === 0) {
          return true;
        }
      }
    }

    // Vérifier les permissions
    return this.hasAnyPermission(...requiredPermissions);
  }
}
