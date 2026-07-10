import { Routes } from '@angular/router';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./user-list/user-list').then((m) => m.UserList),
    title: 'Utilisateurs — EKKLESIA',
  },
  {
    path: 'new',
    loadComponent: () => import('./user-form/user-form').then((m) => m.UserForm),
    title: 'Nouvel utilisateur — EKKLESIA',
  },
  {
    path: ':id',
    loadComponent: () => import('./user-detail/user-detail').then((m) => m.UserDetail),
    title: 'Fiche utilisateur — EKKLESIA',
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./user-form/user-form').then((m) => m.UserForm),
    title: 'Modifier l’utilisateur — EKKLESIA',
  },
  {
    path: ':id/roles',
    loadComponent: () => import('./user-roles/user-roles').then((m) => m.UserRoles),
    title: 'Rôles de l’utilisateur — EKKLESIA',
  },
];
