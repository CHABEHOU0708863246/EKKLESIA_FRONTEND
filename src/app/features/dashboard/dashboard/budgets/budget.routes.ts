import { Routes } from '@angular/router';
import { authGuard } from '../../../../core/guards/auth.guard';

export const BUDGET_ROUTES: Routes = [
  // ─── Liste des budgets ───
  {
    path: '',
    loadComponent: () =>
      import('./budget-list/budget-list').then((m) => m.BudgetList),
    title: 'Budget — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Finance_Budget_Read'] },
  },
  // ─── Création d'un nouveau budget ───
  {
    path: 'new',
    loadComponent: () =>
      import('./budget-form/budget-form').then((m) => m.BudgetForm),
    title: 'Nouveau budget — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Finance_Budget_Create'] },
  },
  // ─── Détail d'un budget ───
  {
    path: ':id',
    loadComponent: () =>
      import('./budget-detail/budget-detail').then((m) => m.BudgetDetail),
    title: 'Détail du budget — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Finance_Budget_Read'] },
  },
  // ─── Édition d'un budget ───
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./budget-form/budget-form').then((m) => m.BudgetForm),
    title: 'Modifier le budget — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Finance_Budget_Update'] },
  },
  // ─── Comparaison budget / réalisé ─── (optionnel)
  {
    path: ':id/comparison',
    loadComponent: () =>
      import('./budget-comparison/budget-comparison').then((m) => m.BudgetComparison),
    title: 'Comparaison budgétaire — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Finance_Budget_Read'] },
  },
];
