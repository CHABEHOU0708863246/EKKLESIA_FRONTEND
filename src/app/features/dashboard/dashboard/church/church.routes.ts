// src/app/features/dashboard/dashboard/admin/church/church.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from '../../../../core/guards/auth.guard';

export const CHURCH_ROUTES: Routes = [
  {
    path: 'new',
    loadComponent: () => import('./church-form/church-form').then((m) => m.ChurchForm),
    title: 'Gestion des églises — MIAV',
    canActivate: [authGuard],
    // 🔒 Écriture : policy backend CAN_MANAGE_CHURCH = Church_Settings_Manage
    data: { permissions: ['Church_Settings_Manage'] },
  },
  {
    path: 'list',
    loadComponent: () => import('./church-list/church-list').then((m) => m.ChurchList),
    title: 'Gestion des églises — MIAV',
    canActivate: [authGuard],
    // 🔒 Lecture : policy backend CAN_READ_CHURCH
    data: { permissions: ['Church_Read', 'Church_Settings_Manage', 'Site_Manage'] },
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./church-edit/church-edit').then((m) => m.ChurchEdit),
    title: 'Modifier l’église — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Church_Settings_Manage'] },
  },
];
