// src/app/features/dashboard/dashboard/members/members.routes.ts
import { Routes } from '@angular/router';

export const MEMBERS_ROUTES: Routes = [
  // ─── Annuaire (liste) ───
  {
    path: '',
    loadComponent: () =>
      import('./member-list/member-list').then((m) => m.MemberList),
    title: 'Annuaire des membres — EKKLESIA',
  },

  // ─── Création ───
  {
    path: 'new',
    loadComponent: () =>
      import('./member-create/member-create').then((m) => m.MemberCreate),
    title: 'Nouveau membre — EKKLESIA',
  },

  // ─── Pipeline visiteurs (Kanban FirstContact → Adhered) ───
  // ⚠️ Placé AVANT ':id' pour éviter que le routeur interprète
  // "pipeline-visiteurs" comme un ID de membre.
  {
    path: 'pipeline-visiteurs',
    loadComponent: () =>
      import('./visitor-pipeline/visitor-pipeline').then((m) => m.VisitorPipeline),
    title: 'Pipeline des visiteurs — EKKLESIA',
  },

  // ─── Suivi pastoral ───
  {
    path: 'suivi-pastoral',
    loadComponent: () =>
      import('./pastoral-care/pastoral-care').then((m) => m.PastoralCare),
    title: 'Suivi pastoral — EKKLESIA',
  },

  // ─── Actes pastoraux ───
  {
    path: 'actes-pastoraux',
    loadComponent: () =>
      import('./pastoral-acts/pastoral-acts').then((m) => m.PastoralActs),
    title: 'Actes pastoraux — EKKLESIA',
  },

  // ─── Cellules de maison ───
  // ⚠️ Placé AVANT ':id' pour la même raison que 'pipeline-visiteurs'.
  {
    path: 'cellules',
    loadComponent: () =>
      import('./cell-group-list/cell-group-list').then((m) => m.CellGroupList),
    title: 'Cellules de maison — EKKLESIA',
  },
  {
    path: 'cellules/:id',
    loadComponent: () =>
      import('./cell-group-detail/cell-group-detail').then((m) => m.CellGroupDetail),
    title: 'Détail de la cellule — EKKLESIA',
  },

  // ─── Détail / édition d'un membre ───
  // ⚠️ Ces routes dynamiques doivent rester en DERNIER : Angular teste
  // les routes dans l'ordre, et ':id' matcherait sinon 'new',
  // 'pipeline-visiteurs', 'cellules', etc. avant qu'ils ne soient testés.
  {
    path: ':id',
    loadComponent: () =>
      import('./member-detail/member-detail').then((m) => m.MemberDetail),
    title: 'Fiche membre — EKKLESIA',
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./member-detail/member-detail').then((m) => m.MemberDetail),
    title: 'Modifier le membre — EKKLESIA',
  },
];
