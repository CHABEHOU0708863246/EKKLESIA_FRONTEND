// src/app/features/dashboard/finances/expenses/expense-list/expense-list.component.ts

import { Component, OnDestroy, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import {
  Expense,
  ExpenseFilter,
  ExpenseStatus,
  ExpenseCategory,
  DEFAULT_EXPENSE_FILTER,
  ExpenseUtils,
  ExpenseCategoryLabels,
  ExpenseCategoryIcons,
  ExpenseStatusLabels,
  ExpenseStatusColors,
  PaymentMethodLabels
} from '../../../../../core/models/Finances/expense.model';
import { Expenses } from '../../../../../core/services/Finances/expenses';

const CATEGORY_OPTIONS = Object.values(ExpenseCategory).map((value) => ({
  value,
  label: ExpenseCategoryLabels[value],
  icon: ExpenseCategoryIcons[value],
}));

const STATUS_OPTIONS = Object.values(ExpenseStatus).map((value) => ({
  value,
  label: ExpenseStatusLabels[value],
}));

@Component({
  selector: 'app-expense-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './expense-list.html',
  styleUrls: ['./expense-list.scss'],
})
export class ExpenseList implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private expensesService = inject(Expenses);
  private router = inject(Router);

  // ── État ──
  expenses = signal<Expense[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  totalCount = signal(0);
  currentPage = signal(1);
  pageSize = signal(20);
  totalPages = signal(1);

  // ── Filtres ──
  searchControl = new FormControl('');
  categoryControl = new FormControl('');
  statusControl = new FormControl('');
  dateFromControl = new FormControl('');
  dateToControl = new FormControl('');

  // ── Statistiques ──
  stats = signal<any>(null);
  statsLoading = signal(false);

  // ── Pagination ──
  pageRangeLabel = computed(() => {
    const total = this.totalCount();
    const page = this.currentPage();
    const size = this.pageSize();
    if (total === 0) return '0 résultat';
    const start = (page - 1) * size + 1;
    const end = Math.min(page * size, total);
    return `${start}–${end} sur ${total}`;
  });

  // ── Actions modales ──
  actionModal = signal<{ visible: boolean; expense: Expense | null; type: 'approve' | 'pay' | 'cancel' | 'delete' }>({
    visible: false,
    expense: null,
    type: 'delete',
  });
  processing = signal(false);

  // ── Helpers ──
  getCategoryLabel = ExpenseUtils.getCategoryLabel;
  getCategoryIcon = ExpenseUtils.getCategoryIcon;
  getStatusLabel = ExpenseUtils.getStatusLabel;
  getStatusColor = ExpenseUtils.getStatusColor;
  getPaymentMethodLabel = ExpenseUtils.getPaymentMethodLabel;
  getFormattedDate = ExpenseUtils.getFormattedDate;
  getFormattedCurrency = ExpenseUtils.getFormattedCurrency;

  readonly categoryOptions = CATEGORY_OPTIONS;
  readonly statusOptions = STATUS_OPTIONS;
  readonly pageSizeOptions = [10, 20, 50, 100];
  readonly ExpenseStatus = ExpenseStatus;

  constructor() {}

  ngOnInit(): void {
    this.loadStats();
    this.loadExpenses();

    // Recherche textuelle
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadExpenses();
      });

    // Filtres
    [this.categoryControl, this.statusControl, this.dateFromControl, this.dateToControl].forEach((ctrl) => {
      ctrl.valueChanges
        .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
        .subscribe(() => {
          this.currentPage.set(1);
          this.loadExpenses();
        });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT
  // ──────────────────────────────────────────────────────────────

  loadExpenses(): void {
    this.loading.set(true);
    this.error.set(null);

    const filter: ExpenseFilter = {
      ...DEFAULT_EXPENSE_FILTER,
      page: this.currentPage(),
      pageSize: this.pageSize(),
      title: this.searchControl.value || undefined,
      category: this.categoryControl.value as ExpenseCategory || undefined,
      status: this.statusControl.value as ExpenseStatus || undefined,
      dateFrom: this.dateFromControl.value || undefined,
      dateTo: this.dateToControl.value || undefined,
    };

    this.expensesService.getAll(filter).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.expenses.set(response.data.items || []);
          this.totalCount.set(response.data.totalCount || 0);
          this.currentPage.set(response.data.currentPage || 1);
          this.totalPages.set(response.data.totalPages || 1);
        } else {
          this.expenses.set([]);
          this.totalCount.set(0);
          this.error.set(response.message || 'Impossible de charger les dépenses.');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Erreur chargement dépenses:', err);
        this.expenses.set([]);
        this.loading.set(false);
        this.error.set('Erreur lors du chargement des dépenses.');
      },
    });
  }

  loadStats(): void {
    this.statsLoading.set(true);
    this.expensesService.getStatistics().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.stats.set(response.data);
        }
        this.statsLoading.set(false);
      },
      error: () => this.statsLoading.set(false),
    });
  }

  refresh(): void {
    this.loadStats();
    this.loadExpenses();
  }

  resetFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.categoryControl.setValue('', { emitEvent: false });
    this.statusControl.setValue('', { emitEvent: false });
    this.dateFromControl.setValue('', { emitEvent: false });
    this.dateToControl.setValue('', { emitEvent: false });
    this.currentPage.set(1);
    this.loadExpenses();
  }

  // ──────────────────────────────────────────────────────────────
  // PAGINATION
  // ──────────────────────────────────────────────────────────────

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadExpenses();
  }

  previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  onPageSizeChange(size: string): void {
    this.pageSize.set(Number(size));
    this.currentPage.set(1);
    this.loadExpenses();
  }

  // ──────────────────────────────────────────────────────────────
  // ACTIONS
  // ──────────────────────────────────────────────────────────────

  viewExpense(expense: Expense): void {
    this.router.navigate(['/dashboard/finances/depenses', expense.id]);
  }

  editExpense(expense: Expense, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/dashboard/finances/depenses', expense.id, 'edit']);
  }

  openActionModal(expense: Expense, type: 'approve' | 'pay' | 'cancel' | 'delete', event: Event): void {
    event.stopPropagation();
    this.actionModal.set({ visible: true, expense, type });
  }

  closeModal(): void {
    this.actionModal.set({ visible: false, expense: null, type: 'delete' });
    this.processing.set(false);
  }

  confirmAction(): void {
  const { expense, type } = this.actionModal();
  if (!expense) return;

  this.processing.set(true);

  const action$: Observable<any> | null = (() => {
    switch (type) {
      case 'approve':
        return this.expensesService.approveExpense(expense.id, {
          expenseId: expense.id,
          approved: true,
        });
      case 'pay':
        return this.expensesService.markAsPaid(expense.id);
      case 'cancel':
        const reason = prompt('Raison de l\'annulation (facultatif) :');
        return this.expensesService.cancelExpense(expense.id, reason || undefined);
      case 'delete':
        return this.expensesService.delete(expense.id);
      default:
        return null;
    }
  })();

  if (!action$) {
    this.processing.set(false);
    this.closeModal();
    return;
  }

  action$.subscribe({
    next: (response: any) => {
      this.processing.set(false);
      this.closeModal();
      if (response.success) {
        this.loadExpenses();
        this.loadStats();
      } else {
        this.error.set(response.message || 'Action échouée.');
      }
    },
    error: (err: any) => {
      console.error('❌ Erreur action:', err);
      this.processing.set(false);
      this.closeModal();
      this.error.set('Une erreur est survenue.');
    },
  });
}

  // ──────────────────────────────────────────────────────────────
  // HELPERS D'AFFICHAGE
  // ──────────────────────────────────────────────────────────────

  getStatusClass(status: ExpenseStatus): string {
    const color = ExpenseStatusColors[status] || 'secondary';
    return `el-badge-${color}`;
  }

  getCategoryClass(category: ExpenseCategory): string {
    const colors: Record<ExpenseCategory, string> = {
      [ExpenseCategory.Salaries]: 'primary',
      [ExpenseCategory.Rent]: 'info',
      [ExpenseCategory.Utilities]: 'warning',
      [ExpenseCategory.Maintenance]: 'secondary',
      [ExpenseCategory.Missions]: 'success',
      [ExpenseCategory.Events]: 'purple',
      [ExpenseCategory.OfficeSupplies]: 'teal',
      [ExpenseCategory.Transportation]: 'orange',
      [ExpenseCategory.Communication]: 'cyan',
      [ExpenseCategory.Construction]: 'brown',
      [ExpenseCategory.Repairs]: 'red',
      [ExpenseCategory.Insurance]: 'indigo',
      [ExpenseCategory.Taxes]: 'pink',
      [ExpenseCategory.Other]: 'gray',
    };
    return `el-category-${colors[category] || 'secondary'}`;
  }

  getPendingCount(): number {
    const stats = this.stats();
    return stats?.countByStatus?.[ExpenseStatus.Pending] || 0;
  }
}
