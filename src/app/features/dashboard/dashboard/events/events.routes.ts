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

  // ─── Mes inscriptions ───
  // ⚠️ Placé AVANT ':id' pour éviter qu'Angular interprète
  // "mes-inscriptions" comme un ID d'événement.
  {
    path: 'mes-inscriptions',
    loadComponent: () =>
      import('./my-registrations/my-registrations').then((m) => m.MyRegistrations),
    title: 'Mes inscriptions — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Event_Register'] },
  },

  // ─── Gestion des inscriptions & billetterie ───
  // ⚠️ Placé AVANT ':id' pour la même raison.
  {
    path: 'inscriptions',
    loadComponent: () =>
      import('./event-registrations/event-registrations').then((m) => m.EventRegistrations),
    title: 'Inscriptions & billetterie — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Event_Registration_Manage'] },
  },

  // ─── Check-in d'un événement ───
  // ⚠️ Route dynamique qui doit être testée APRÈS les routes statiques
  // mais AVANT les routes génériques ':id' et ':id/edit'
  {
    path: ':id/checkin',
    loadComponent: () =>
      import('./event-checkin/event-checkin').then((m) => m.EventCheckin),
    title: 'Check-in — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Event_Checkin'] },
  },

  // ─── Détail / édition d'un événement ───
  // ⚠️ Routes dynamiques en DERNIER : Angular teste les routes dans
  // l'ordre, et ':id' matcherait sinon 'new', 'mes-inscriptions',
  // 'inscriptions', etc. avant qu'elles ne soient testées.
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
