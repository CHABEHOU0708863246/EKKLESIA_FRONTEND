// src/app/features/dashboard/dashboard/members/members.routes.ts
import { Routes } from '@angular/router';

export const MEMBERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./member-list/member-list').then((m) => m.MemberList),
    title: 'Annuaire des membres — EKKLESIA',
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./member-create/member-create').then((m) => m.MemberCreate),
    title: 'Nouveau membre — EKKLESIA',
  },

  // TODO : à créer quand ces composants existeront
  // { path: 'suivi-pastoral', loadComponent: () => import('./pastoral-tracking/pastoral-tracking').then(m => m.PastoralTracking) },
  // { path: 'actes-pastoraux', loadComponent: () => import('./pastoral-acts/pastoral-acts').then(m => m.PastoralActs) },
];
