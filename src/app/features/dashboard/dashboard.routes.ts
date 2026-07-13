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
    {
      path: 'admin/mon-profil',
      loadComponent: () => import('./dashboard/my-profile/my-profile').then((m) => m.MyProfile),
      title: 'Mon profil — EKKLESIA',
    },
    {
      path: 'admin/parametres/eglise',
      loadChildren: () => import('./dashboard/church/church.routes').then((m) => m.CHURCH_ROUTES),
    },
    {
      path: 'actes-pastoraux',
      loadChildren: () =>
        import('./dashboard/pastoral-acts/pastoral-act.routes').then((m) => m.PASTORAL_ACTS_ROUTES),
    },
  ],
},
];
