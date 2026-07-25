// src/app/features/dashboard/pastor/appointments/appointments.routes.ts

import { Routes } from '@angular/router';
import { authGuard } from '../../../../core/guards/auth.guard';

export const APPOINTMENTS_ROUTES: Routes = [
  // ─── Liste / Agenda ───
  {
    path: '',
    loadComponent: () =>
      import('./appointment-list/appointment-list').then((m) => m.AppointmentList),
    title: 'Agenda pastoral — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Pastoral_Appointment_Manage'] },
  },

  // ─── Nouveau rendez-vous ───
  {
    path: 'new',
    loadComponent: () =>
      import('./appointment-form/appointment-form').then((m) => m.AppointmentForm),
    title: 'Nouveau rendez-vous — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Pastoral_Appointment_Manage'] },
  },

  // ─── Détail d'un rendez-vous ───
  {
    path: ':id',
    loadComponent: () =>
      import('./appointment-detail/appointment-detail').then((m) => m.AppointmentDetail),
    title: 'Détail du rendez-vous — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Pastoral_Appointment_Manage'] },
  },

  // ─── Modification ───
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./appointment-form/appointment-form').then((m) => m.AppointmentForm),
    title: 'Modifier le rendez-vous — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Pastoral_Appointment_Manage'] },
  },
];
