import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';

export const DASHBOARD_ROUTES: Routes = [
{
  path: '',
  component: Dashboard,
  children: [
    {
      path: '',
      loadComponent: () =>
        import('./dashboard/dashboard-home/dashboard-home').then((m) => m.DashboardHome),
    },
    {
      path: 'membres',
      loadChildren: () =>
        import('./dashboard/members/members.routes').then((m) => m.MEMBERS_ROUTES),
    },
    {
      path: 'admin/users',
      loadChildren: () =>
        import('./dashboard/users/users.routes').then((m) => m.USERS_ROUTES),
    },
    {
      path: 'admin/roles',
      loadChildren: () =>
        import('./dashboard/roles/roles.routes').then((m) => m.ROLES_ROUTES),
    },
    // // Route pour l'audit
    // {
    //   path: 'admin/audit',
    //   loadComponent: () =>
    //     import('./dashboard/audit/audit-log').then((m) => m.AuditLog),
    // },
    // // Routes pour les paramètres
    // {
    //   path: 'admin/parametres',
    //   loadChildren: () =>
    //     import('./dashboard/parametres/parametres.routes').then((m) => m.PARAMETRES_ROUTES),
    // },
  ],
},
];
