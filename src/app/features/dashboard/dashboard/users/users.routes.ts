// users.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from '../../../../core/guards/auth.guard';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./user-list/user-list').then((m) => m.UserList),
    title: 'Utilisateurs — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['User_Read', 'User_Create', 'User_Update'] },
  },
  {
    path: 'new',
    loadComponent: () => import('./user-form/user-form').then((m) => m.UserForm),
    title: 'Nouvel utilisateur — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['User_Create'] },
  },
  {
    path: ':id',
    loadComponent: () => import('./user-detail/user-detail').then((m) => m.UserDetail),
    title: 'Fiche utilisateur — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['User_Read'] },
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./user-form/user-form').then((m) => m.UserForm),
    title: 'Modifier l\'utilisateur — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['User_Update'] },
  },
  {
    path: ':id/roles',
    loadComponent: () => import('./user-roles/user-roles').then((m) => m.UserRoles),
    title: 'Rôles de l\'utilisateur — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Role_Manage'] },
  },
];
