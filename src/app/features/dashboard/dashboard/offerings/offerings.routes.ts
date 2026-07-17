import { Routes } from '@angular/router';
import { authGuard } from '../../../../core/guards/auth.guard';

export const OFFERINGS_ROUTES: Routes = [
  // ─── Liste des offrandes ───
  {
    path: '',
    loadComponent: () =>
      import('./offering-list/offering-list').then((m) => m.OfferingList),
    title: 'Offrandes — EKKLESIA',
    canActivate: [authGuard],
    data: { permissions: ['Finance_Offering_Read'] },
  },

  // ─── Création d'une nouvelle offrande ───
  {
    path: 'new',
    loadComponent: () =>
      import('./offering-form/offering-form').then((m) => m.OfferingForm),
    title: 'Nouvelle offrande — EKKLESIA',
    canActivate: [authGuard],
    data: { permissions: ['Finance_Offering_Create'] },
  },

  // ─── Offrandes par membre ───
  // ⚠️ Placé AVANT ':id' pour éviter qu'il soit interprété comme un ID
  {
    path: 'par-membre',
    loadComponent: () =>
      import('./offering-by-member/offering-by-member').then((m) => m.OfferingByMember),
    title: 'Dons par membre — EKKLESIA',
    canActivate: [authGuard],
    data: { permissions: ['Finance_Offering_Read'] },
  },

  // ─── Reçus fiscaux ───
  {
    path: 'recus',
    loadComponent: () =>
      import('./offering-receipts/offering-receipts').then((m) => m.OfferingReceipts),
    title: 'Reçus fiscaux — EKKLESIA',
    canActivate: [authGuard],
    data: { permissions: ['Finance_Receipt_Generate'] },
  },

  // ─── Détail d'une offrande ───
  // ⚠️ Routes dynamiques en DERNIER
  {
    path: ':id',
    loadComponent: () =>
      import('./offering-detail/offering-detail').then((m) => m.OfferingDetail),
    title: 'Détail de l\'offrande — EKKLESIA',
    canActivate: [authGuard],
    data: { permissions: ['Finance_Offering_Read'] },
  },

  // ─── Édition d'une offrande ───
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./offering-form/offering-form').then((m) => m.OfferingForm),
    title: 'Modifier l\'offrande — EKKLESIA',
    canActivate: [authGuard],
    data: { permissions: ['Finance_Offering_Update'] },
  },
];
