// roles.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from '../../../../core/guards/auth.guard';

export const ROLES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./role-list/role-list').then((m) => m.RoleList),
    title: 'Rôles — EKKLESIA',
    canActivate: [authGuard],
    data: { permissions: ['Role_Manage'] },
  },
  {
    path: 'new',
    loadComponent: () => import('./role-form/role-form').then((m) => m.RoleForm),
    title: 'Nouveau rôle — EKKLESIA',
    canActivate: [authGuard],
    data: { permissions: ['Role_Manage'] },
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./role-form/role-form').then((m) => m.RoleForm),
    title: 'Modifier le rôle — EKKLESIA',
    canActivate: [authGuard],
    data: { permissions: ['Role_Manage'] },
  },
];
