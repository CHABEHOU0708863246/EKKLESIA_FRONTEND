import { Routes } from '@angular/router';
import { authGuard } from '../../../../core/guards/auth.guard';

export const MEDIAS_ROUTES: Routes = [
  // ─── Bibliothèque (liste des contenus) ───
  {
    path: 'bibliotheque',
    loadComponent: () =>
      import('./content-list/content-list').then((m) => m.ContentList),
    title: 'Bibliothèque média — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Content_Read'] },
  },

  // ─── Ajouter un contenu ───
  {
    path: 'bibliotheque/new',
    loadComponent: () =>
      import('./content-form/content-form').then((m) => m.ContentForm),
    title: 'Ajouter un contenu — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Content_Create'] },
  },

  // ─── Détail d'un contenu ───
  {
    path: 'bibliotheque/:id',
    loadComponent: () =>
      import('./content-detail/content-detail').then((m) => m.ContentDetail),
    title: 'Détail du contenu — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Content_Read'] },
  },

  // ─── Modifier un contenu ───
  {
    path: 'bibliotheque/:id/edit',
    loadComponent: () =>
      import('./content-form/content-form').then((m) => m.ContentForm),
    title: 'Modifier le contenu — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Content_Update'] },
  },

  // ─── Diffusion en direct ───
  {
    path: 'diffusion',
    loadComponent: () =>
      import('./live-broadcast/live-broadcast').then((m) => m.LiveBroadcast),
    title: 'Diffusion en direct — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Communication_Broadcast'] },
  },

  // ─── Newsletters ───
  {
    path: 'newsletter',
    loadComponent: () =>
      import('./newsletter/newsletter').then((m) => m.Newsletter),
    title: 'Newsletters — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Communication_Newsletter'] },
  },
];
