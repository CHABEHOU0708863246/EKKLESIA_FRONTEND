import { Routes } from '@angular/router';
import { authGuard } from '../../../../core/guards/auth.guard';

export const EXPENSES_ROUTES: Routes = [
  // ─── Liste des dépenses ───
  {
    path: '',
    loadComponent: () =>
      import('./expense-list/expense-list').then((m) => m.ExpenseList),
    title: 'Dépenses — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Finance_Expense_Read'] },
  },

  // ─── Création d'une nouvelle dépense ───
  {
    path: 'new',
    loadComponent: () =>
      import('./expense-form/expense-form').then((m) => m.ExpenseForm),
    title: 'Nouvelle dépense — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Finance_Expense_Create'] },
  },

  // ─── Détail d'une dépense ───
  // ⚠️ Routes dynamiques en DERNIER
  {
    path: ':id',
    loadComponent: () =>
      import('./expense-detail/expense-detail').then((m) => m.ExpenseDetail),
    title: 'Détail de la dépense — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Finance_Expense_Read'] },
  },

  // ─── Édition d'une dépense ───
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./expense-form/expense-form').then((m) => m.ExpenseForm),
    title: 'Modifier la dépense — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Finance_Expense_Update'] },
  },
];
