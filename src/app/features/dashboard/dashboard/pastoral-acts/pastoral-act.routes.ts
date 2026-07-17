import { Routes } from '@angular/router';
import { authGuard } from '../../../../core/guards/auth.guard';

export const PASTORAL_ACTS_ROUTES: Routes = [
  // ─── Liste des actes pastoraux ───
  {
    path: '',
    loadComponent: () =>
      import('./pastoral-act-list/pastoral-act-list').then((m) => m.PastoralActList),
    title: 'Actes pastoraux — EKKLESIA',
    canActivate: [authGuard],
    data: { permissions: ['PastoralAct_Read', 'PastoralAct_Create', 'PastoralAct_Update'] },
  },

  {
  path: ':id/edit',
  loadComponent: () =>
    import('./pastoral-act-edit/pastoral-act-edit').then((m) => m.PastoralActEdit),
  title: "Modifier l'acte pastoral — EKKLESIA",
  canActivate: [authGuard],
  data: { permissions: ['PastoralAct_Update'] },
},

  // ─── Création d'un nouvel acte pastoral ───
  {
    path: 'new',
    loadComponent: () =>
      import('./pastoral-act-create/pastoral-act-create').then((m) => m.PastoralActCreate),
    title: 'Nouvel acte pastoral — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['PastoralAct_Create'] },
  },

  // ─── Détail / édition d'un acte pastoral ───
  // ⚠️ Routes dynamiques en DERNIER : ':id' matcherait sinon 'new'
  // si elle était testée avant.
  {
    path: ':id',
    loadComponent: () =>
      import('./pastoral-act-detail/pastoral-act-detail').then((m) => m.PastoralActDetail),
    title: 'Détail de l\'acte pastoral — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['PastoralAct_Read'] },
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pastoral-act-detail/pastoral-act-detail').then((m) => m.PastoralActDetail),
    title: 'Modifier l\'acte pastoral — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['PastoralAct_Update'] },
  },
];
