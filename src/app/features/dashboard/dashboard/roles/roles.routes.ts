import { Routes } from '@angular/router';

export const ROLES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./role-list/role-list').then((m) => m.RoleList),
    title: 'Rôles — EKKLESIA',
  },
  {
    path: 'new',
    loadComponent: () => import('./role-form/role-form').then((m) => m.RoleForm),
    title: 'Nouveau rôle — EKKLESIA',
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./role-form/role-form').then((m) => m.RoleForm),
    title: 'Modifier le rôle — EKKLESIA',
  }
];
