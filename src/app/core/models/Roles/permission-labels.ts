// src/app/core/models/Roles/permission-labels.ts

export const PERMISSION_LABELS: Record<string, string> = {
  // ──────────────────────────────────────────────
  // 👥 MEMBRES
  // ──────────────────────────────────────────────
  'Member_Create': 'Créer un membre',
  'Member_Read': 'Voir les membres',
  'Member_Update': 'Modifier un membre',
  'Member_Delete': 'Supprimer un membre',
  'Member_Validate': 'Valider un membre',
  'Member_Export': 'Exporter les membres',
  'Member_Import': 'Importer des membres',
  'Member_Status_Manage': 'Gérer le statut des membres',
  'Member_History_View': 'Voir l\'historique des membres',
  'Member_Family_Manage': 'Gérer les familles',
  'Member_Report_Generate': 'Générer des rapports membres',

  // ──────────────────────────────────────────────
  // 🙏 SUIVI PASTORAL
  // ──────────────────────────────────────────────
  'Pastoral_Note_Create': 'Créer une note pastorale',
  'Pastoral_Note_Read': 'Voir les notes pastorales',
  'Pastoral_Note_Update': 'Modifier une note pastorale',
  'Pastoral_Note_Delete': 'Supprimer une note pastorale',
  'Pastoral_Note_Export': 'Exporter les notes pastorales',
  'Pastoral_Note_View_All': 'Voir toutes les notes',
  'Pastoral_Appointment_Manage': 'Gérer les rendez-vous',
  'Pastoral_Prayer_Manage': 'Gérer les requêtes de prière',
  'Pastoral_Report_Generate': 'Générer des rapports pastoraux',

  // ──────────────────────────────────────────────
  // 🏠 CELLULES
  // ──────────────────────────────────────────────
  'Cell_Create': 'Créer une cellule',
  'Cell_Read': 'Voir les cellules',
  'Cell_Update': 'Modifier une cellule',
  'Cell_Delete': 'Supprimer une cellule',
  'Cell_Assign': 'Assigner des membres',
  'Cell_Attendance_Read': 'Voir les présences',
  'Cell_Attendance_Update': 'Modifier les présences',
  'Cell_Report_Submit': 'Soumettre un rapport',
  'Cell_Report_Generate': 'Générer des rapports cellules',
  'Cell_Leader_Manage': 'Gérer les leaders',

  // ──────────────────────────────────────────────
  // 💰 FINANCES
  // ──────────────────────────────────────────────
  'Finance_Offering_Create': 'Créer une collecte',
  'Finance_Offering_Read': 'Voir les collectes',
  'Finance_Offering_Update': 'Modifier une collecte',
  'Finance_Offering_Delete': 'Supprimer une collecte',
  'Finance_Offering_Validate': 'Valider une collecte',
  'Finance_Offering_Export': 'Exporter les collectes',
  'Finance_Receipt_Generate': 'Générer des reçus',
  'Finance_Expense_Create': 'Créer une dépense',
  'Finance_Expense_Read': 'Voir les dépenses',
  'Finance_Expense_Update': 'Modifier une dépense',
  'Finance_Expense_Validate': 'Valider une dépense',
  'Finance_Expense_Approve': 'Approuver une dépense',
  'Finance_Expense_Export': 'Exporter les dépenses',
  'Finance_Budget_Create': 'Créer un budget',
  'Finance_Budget_Read': 'Voir les budgets',
  'Finance_Budget_Update': 'Modifier un budget',
  'Finance_Budget_Approve': 'Approuver un budget',
  'Finance_Budget_Follow': 'Suivi budgétaire',
  'Finance_Consolidated_View': 'Voir la consolidation',
  'Finance_Report_Generate': 'Générer des rapports financiers',
  'Finance_Report_Export': 'Exporter les rapports financiers',
  'Finance_Bank_Manage': 'Gérer les comptes bancaires',
  'Finance_Transfer_Make': 'Effectuer des transferts',

  // ──────────────────────────────────────────────
  // 📅 ÉVÉNEMENTS
  // ──────────────────────────────────────────────
  'Event_Create': 'Créer un événement',
  'Event_Read': 'Voir les événements',
  'Event_Update': 'Modifier un événement',
  'Event_Delete': 'Supprimer un événement',
  'Event_Register': 'S\'inscrire à un événement',
  'Event_Registration_Manage': 'Gérer les inscriptions',
  'Event_Checkin': 'Gérer les points de présence',
  'Event_Payment_Manage': 'Gérer les paiements',
  'Event_Report_Generate': 'Générer des rapports événements',

  // ──────────────────────────────────────────────
  // ⛪ CULTES
  // ──────────────────────────────────────────────
  'Service_Create': 'Créer un culte',
  'Service_Read': 'Voir les cultes',
  'Service_Update': 'Modifier un culte',
  'Service_Attendance_Record': 'Enregistrer les présences',
  'Service_Attendance_Read': 'Voir les présences culte',
  'Service_Planning_Manage': 'Gérer la planification',
  'Service_Team_Manage': 'Gérer les équipes',

  // ──────────────────────────────────────────────
  // 🏢 PATRIMOINE
  // ──────────────────────────────────────────────
  'Property_Create': 'Créer un bien',
  'Property_Read': 'Voir les biens',
  'Property_Update': 'Modifier un bien',
  'Property_Delete': 'Supprimer un bien',
  'Property_Export': 'Exporter les biens',
  'Contract_Create': 'Créer un contrat',
  'Contract_Read': 'Voir les contrats',
  'Contract_Update': 'Modifier un contrat',
  'Contract_Validate': 'Valider un contrat',
  'Contract_Terminate': 'Résilier un contrat',
  'Contract_Renew': 'Renouveler un contrat',
  'Contract_Export': 'Exporter les contrats',
  'Maintenance_Report': 'Signaler une maintenance',
  'Maintenance_Manage': 'Gérer les maintenances',
  'Maintenance_Assign': 'Assigner une maintenance',
  'Maintenance_Complete': 'Valider une maintenance',
  'Insurance_Manage': 'Gérer les assurances',

  // ──────────────────────────────────────────────
  // 📢 COMMUNICATION
  // ──────────────────────────────────────────────
  'Content_Create': 'Créer un contenu',
  'Content_Read': 'Voir les contenus',
  'Content_Update': 'Modifier un contenu',
  'Content_Delete': 'Supprimer un contenu',
  'Content_Publish': 'Publier un contenu',
  'Content_Archive': 'Archiver un contenu',
  'Content_Export': 'Exporter les contenus',
  'Communication_Broadcast': 'Diffuser en direct',
  'Communication_Newsletter': 'Gérer les newsletters',
  'Communication_Template_Manage': 'Gérer les modèles',
  'Communication_Plan': 'Planifier les communications',
  'Communication_Stats_View': 'Voir les statistiques',
  'Communication_Sms_Manage': 'Gérer les SMS',
  'Communication_Email_Manage': 'Gérer les emails',

  // ──────────────────────────────────────────────
  // 👤 RESSOURCES HUMAINES
  // ──────────────────────────────────────────────
  'Employee_Create': 'Créer un employé',
  'Employee_Read': 'Voir les employés',
  'Employee_Update': 'Modifier un employé',
  'Employee_Delete': 'Supprimer un employé',
  'Employee_Export': 'Exporter les employés',
  'Payroll_Calculate': 'Calculer la paie',
  'Payroll_Read': 'Voir les paies',
  'Payroll_Export': 'Exporter les paies',
  'Leave_Manage': 'Gérer les congés',
  'Leave_Approve': 'Approuver les congés',
  'Volunteer_Create': 'Créer un bénévole',
  'Volunteer_Read': 'Voir les bénévoles',
  'Volunteer_Update': 'Modifier un bénévole',
  'Volunteer_Delete': 'Supprimer un bénévole',
  'Volunteer_Assign': 'Assigner un bénévole',
  'Volunteer_Schedule_Manage': 'Gérer le planning',
  'Volunteer_Schedule_Read': 'Voir le planning',
  'Volunteer_Schedule_Confirm': 'Confirmer le planning',
  'Volunteer_Export': 'Exporter les bénévoles',

  // ──────────────────────────────────────────────
  // 📊 TABLEAU DE BORD
  // ──────────────────────────────────────────────
  'Dashboard_View': 'Voir le tableau de bord',
  'Dashboard_Customize': 'Personnaliser le tableau de bord',
  'Dashboard_Export': 'Exporter le tableau de bord',
  'Report_Generate': 'Générer des rapports',
  'Report_Read': 'Voir les rapports',
  'Report_Export': 'Exporter les rapports',
  'Report_Schedule': 'Planifier les rapports',

  // ──────────────────────────────────────────────
  // 🔔 NOTIFICATIONS
  // ──────────────────────────────────────────────
  'Notification_Read': 'Voir les notifications',
  'Notification_Send': 'Envoyer des notifications',
  'Notification_Configure': 'Configurer les notifications',
  'Notification_Template_Manage': 'Gérer les modèles de notifications',

  // ──────────────────────────────────────────────
  // 🏛️ ADMINISTRATION
  // ──────────────────────────────────────────────
  'User_Create': 'Créer un utilisateur',
  'User_Read': 'Voir les utilisateurs',
  'User_Update': 'Modifier un utilisateur',
  'User_Delete': 'Supprimer un utilisateur',
  'User_Activate': 'Activer un utilisateur',
  'User_Deactivate': 'Désactiver un utilisateur',
  'Role_Manage': 'Gérer les rôles',
  'Permission_Manage': 'Gérer les permissions',
  'Audit_Read': 'Voir les journaux d\'audit',
  'Audit_Export': 'Exporter les journaux d\'audit',
  'Settings_Read': 'Voir les paramètres',
  'Settings_Update': 'Modifier les paramètres',
  'Church_Settings_Manage': 'Gérer les paramètres de l\'église',
  'Site_Manage': 'Gérer les sites',
};

/**
 * Récupère le libellé français d'une permission
 */
export function getPermissionLabel(permission: string): string {
  return PERMISSION_LABELS[permission] || permission;
}

/**
 * Récupère le libellé français d'une permission avec le code entre parenthèses
 */
export function getPermissionLabelWithCode(permission: string): string {
  const label = PERMISSION_LABELS[permission];
  return label ? `${label} (${permission})` : permission;
}
