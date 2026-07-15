// src/app/features/dashboard/dashboard/events/events.routes.ts

import { Routes } from '@angular/router';
import { authGuard } from '../../../../core/guards/auth.guard';

export const EVENTS_ROUTES: Routes = [
  // ─── Liste des événements ───
  {
    path: '',
    loadComponent: () =>
      import('./event-list/event-list').then((m) => m.EventList),
    title: 'Événements — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Event_Read'] },
  },

  // ─── Création d'un nouvel événement ───
  {
    path: 'new',
    loadComponent: () =>
      import('./event-form/event-form').then((m) => m.EventForm),
    title: 'Créer un événement — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Event_Create'] },
  },

  // ✅ Rendre la route dynamique avec l'ID de l'événement
  {
    path: 'inscriptions',
    loadComponent: () =>
      import('./event-registrations/event-registrations').then((m) => m.EventRegistrations),
    title: 'Inscriptions & billetterie — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Event_Registration_Manage'] },
  },

  // ─── Check-in d'un événement ───
  {
    path: ':id/checkin',
    loadComponent: () =>
      import('./event-checkin/event-checkin').then((m) => m.EventCheckin),
    title: 'Check-in — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Event_Checkin'] },
  },

  {
    path: ':id',
    loadComponent: () =>
      import('./event-detail/event-detail').then((m) => m.EventDetail),
    title: 'Détail de l\'événement — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Event_Read'] },
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./event-detail/event-detail').then((m) => m.EventDetail),
    title: 'Modifier l\'événement — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Event_Update'] },
  },
];
