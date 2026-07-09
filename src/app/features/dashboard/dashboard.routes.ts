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
  ],
},
];
