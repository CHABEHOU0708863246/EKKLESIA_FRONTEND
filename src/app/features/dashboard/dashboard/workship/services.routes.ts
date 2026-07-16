// src/app/features/dashboard/services/services.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from '../../../../core/guards/auth.guard';

export const SERVICES_ROUTES: Routes = [
  // ─── Liste des cultes (programmation) ───
  {
    path: '',
    loadComponent: () =>
      import('./service-list/service-list').then((m) => m.ServiceList),
    title: 'Programmation des cultes — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Service_Read'] },
  },

  // ─── Création d'un nouveau culte ───
  {
    path: 'new',
    loadComponent: () =>
      import('./service-form/service-form').then((m) => m.ServiceForm),
    title: 'Nouveau culte — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Service_Create'] },
  },

  // ─── Présence & statistiques ───
  // ⚠️ Placé AVANT ':id' pour éviter qu'il soit interprété comme un ID
  {
    path: 'presence',
    loadComponent: () =>
      import('./service-attendance/service-attendance').then((m) => m.ServiceAttendance),
    title: 'Présence & statistiques — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Service_Attendance_Read'] },
  },

  // ─── Bibliothèque de sermons ───
  // ⚠️ Sous-arborescence dédiée (liste, création, édition), même principe
  // que 'membres/actes-pastoraux'. Placée AVANT ':id' pour éviter toute
  // collision avec l'ID d'un culte.
  {
    path: 'sermons',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./sermon-list/sermon-list').then((m) => m.SermonList),
        title: 'Bibliothèque de sermons — MIAV',
        canActivate: [authGuard],
        data: { permissions: ['Content_Read'] },
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./sermon-form/sermon-form').then((m) => m.SermonForm),
        title: 'Nouveau sermon — MIAV',
        canActivate: [authGuard],
        data: { permissions: ['Content_Create'] },
      },
      {
      path: ':id/edit',
      loadComponent: () =>
        import('./sermon-edit/sermon-edit').then((m) => m.SermonEdit),
      title: 'Modifier le sermon — MIAV',
      canActivate: [authGuard],
      data: { permissions: ['Content_Update'] },
      },
    ],
  },

  // ─── Détail d'un culte ───
  // ⚠️ Routes dynamiques en DERNIER (après les routes statiques)
  {
    path: ':id',
    loadComponent: () =>
      import('./service-detail/service-detail').then((m) => m.ServiceDetail),
    title: 'Détail du culte — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Service_Read'] },
  },

  // ─── Édition d'un culte ───
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./service-form/service-form').then((m) => m.ServiceForm),
    title: 'Modifier le culte — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Service_Update'] },
  },
];
