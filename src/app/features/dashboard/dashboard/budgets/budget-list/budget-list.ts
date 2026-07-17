// src/app/features/dashboard/finances/budget/budget-list/budget-list.component.ts

import { Component, OnDestroy, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import {
  Budget,
  BudgetFilter,
  BudgetStatus,
  DEFAULT_BUDGET_FILTER,
  BudgetUtils,
  BudgetStatusLabels,
  BudgetStatusColors
} from '../../../../../core/models/Finances/budget.model';
import { BudgetResponseDto } from '../../../../../core/models/Finances/budget-statistics.model';
import { BudgetService } from '../../../../../core/services/Finances/budjets';


const STATUS_OPTIONS = Object.values(BudgetStatus).map((value) => ({
  value,
  label: BudgetStatusLabels[value],
}));

@Component({
  selector: 'app-budget-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './budget-list.html',
  styleUrls: ['./budget-list.scss'],
})
export class BudgetList implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private budgetService = inject(BudgetService);
  private router = inject(Router);

  // ── État ──
  budgets = signal<BudgetResponseDto[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  totalCount = signal(0);
  currentPage = signal(1);
  pageSize = signal(20);
  totalPages = signal(1);

  // ── Filtres ──
  searchControl = new FormControl('');
  yearControl = new FormControl<number | null>(null);
  statusControl = new FormControl('');

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
  actionModal = signal<{
    visible: boolean;
    budget: BudgetResponseDto | null;
    type: 'approve' | 'reject' | 'close' | 'delete';
    rejectReason: string;
  }>({
    visible: false,
    budget: null,
    type: 'delete',
    rejectReason: '',
  });
  processing = signal(false);

  // ── Helpers ──
  getStatusLabel = BudgetUtils.getStatusLabel;
  getStatusColor = BudgetUtils.getStatusColor;
  getFormattedDate = BudgetUtils.getFormattedDate;
  getFormattedCurrency = BudgetUtils.getFormattedCurrency;

  readonly statusOptions = STATUS_OPTIONS;
  readonly pageSizeOptions = [10, 20, 50, 100];
  readonly BudgetStatus = BudgetStatus;

  // ── Années disponibles (pour le filtre) ──
  availableYears = computed(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear - 5; y <= currentYear + 1; y++) {
      years.push(y);
    }
    return years;
  });

  constructor() {}

ngOnInit(): void {
  this.loadStats();
  this.loadBudgets();

  this.searchControl.valueChanges
    .pipe(
      debounceTime(350),
      distinctUntilChanged((prev, curr) => prev === curr),
      takeUntil(this.destroy$)
    )
    .subscribe(() => {
      this.currentPage.set(1);
      this.loadBudgets();
    });

  [this.yearControl, this.statusControl].forEach((ctrl) => {
  (ctrl.valueChanges as Observable<any>)
    .pipe(
      distinctUntilChanged((prev, curr) => prev === curr),
      takeUntil(this.destroy$)
    )
    .subscribe({
      next: () => {
        this.currentPage.set(1);
        this.loadBudgets();
      }
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

  loadBudgets(): void {
    this.loading.set(true);
    this.error.set(null);

    const filter: BudgetFilter = {
      ...DEFAULT_BUDGET_FILTER,
      page: this.currentPage(),
      pageSize: this.pageSize(),
      name: this.searchControl.value || undefined,
      year: this.yearControl.value || undefined,
      status: this.statusControl.value as BudgetStatus || undefined,
    };

    this.budgetService.getAll(filter).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.budgets.set(response.data.items || []);
          this.totalCount.set(response.data.totalCount || 0);
          this.currentPage.set(response.data.currentPage || 1);
          this.totalPages.set(response.data.totalPages || 1);
        } else {
          this.budgets.set([]);
          this.totalCount.set(0);
          this.error.set(response.message || 'Impossible de charger les budgets.');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Erreur chargement budgets:', err);
        this.budgets.set([]);
        this.loading.set(false);
        this.error.set('Erreur lors du chargement des budgets.');
      },
    });
  }

  loadStats(): void {
    this.statsLoading.set(true);
    this.budgetService.getStatistics().subscribe({
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
    this.loadBudgets();
  }

  resetFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.yearControl.setValue(null, { emitEvent: false });
    this.statusControl.setValue('', { emitEvent: false });
    this.currentPage.set(1);
    this.loadBudgets();
  }

  // ──────────────────────────────────────────────────────────────
  // PAGINATION
  // ──────────────────────────────────────────────────────────────

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadBudgets();
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
    this.loadBudgets();
  }

  // ──────────────────────────────────────────────────────────────
  // ACTIONS
  // ──────────────────────────────────────────────────────────────

  viewBudget(budget: BudgetResponseDto): void {
    this.router.navigate(['/dashboard/finances/budget', budget.id]);
  }

  editBudget(budget: BudgetResponseDto, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/dashboard/finances/budget', budget.id, 'edit']);
  }

  openActionModal(
    budget: BudgetResponseDto,
    type: 'approve' | 'reject' | 'close' | 'delete',
    event: Event
  ): void {
    event.stopPropagation();
    this.actionModal.set({
      visible: true,
      budget,
      type,
      rejectReason: '',
    });
  }

  closeModal(): void {
    this.actionModal.set({ visible: false, budget: null, type: 'delete', rejectReason: '' });
    this.processing.set(false);
  }

confirmAction(): void {
  const { budget, type, rejectReason } = this.actionModal();
  if (!budget) return;

  this.processing.set(true);

  const action$: Observable<any> | null = (() => {
    switch (type) {
      case 'approve':
        return this.budgetService.approveBudget(budget.id);
      case 'reject':
        return this.budgetService.rejectBudget(budget.id, rejectReason || undefined);
      case 'close':
        return this.budgetService.closeBudget(budget.id);
      case 'delete':
        return this.budgetService.delete(budget.id);
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
        this.loadBudgets();
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

  getStatusClass(status: BudgetStatus): string {
    const color = BudgetStatusColors[status] || 'secondary';
    return `bl-badge-${color}`;
  }

  getUtilizationColor(rate: number): string {
    if (rate >= 90) return 'danger';
    if (rate >= 70) return 'warning';
    if (rate >= 40) return 'info';
    return 'success';
  }

  canApprove(budget: BudgetResponseDto): boolean {
    return budget.status === BudgetStatus.Draft || budget.status === BudgetStatus.Pending;
  }

  canReject(budget: BudgetResponseDto): boolean {
    return budget.status === BudgetStatus.Pending;
  }

  canClose(budget: BudgetResponseDto): boolean {
    return budget.status === BudgetStatus.Approved;
  }

  canDelete(budget: BudgetResponseDto): boolean {
    return budget.status === BudgetStatus.Draft;
  }

  canEdit(budget: BudgetResponseDto): boolean {
    return (
      budget.status === BudgetStatus.Draft || budget.status === BudgetStatus.Pending
    );
  }
}
