import { Routes } from '@angular/router';
import { NotFound } from './core/components/not-found/not-found';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  // ✅ NOUVEAU : Routes publiques pour l'inscription
  {
    path: 'inscription',
    children: [
      // Page d'inscription à un événement
      {
        path: ':eventId',
        loadComponent: () =>
          import('./core/components/public-event-registration/public-event-registration').then(
            (m) => m.PublicEventRegistration
          ),
        title: 'Inscription — MIAV',
      },
      // ✅ REDIRECTION : si l'utilisateur arrive sur /inscription sans ID
      {
        path: '',
        redirectTo: '/auth/login',
        pathMatch: 'full',
      },
    ],
  },
  // ✅ NOUVEAU : Confirmation de paiement (public)
  {
    path: 'paiement/confirmation',
    loadComponent: () =>
      import('./core/components/payment-confirmation/payment-confirmation').then(
        (m) => m.PaymentConfirmation
      ),
    title: 'Confirmation de paiement — MIAV',
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
    canActivate: [authGuard],
  },
  {
    path: '**',
    component: NotFound,
  },
];
