// src/app/features/dashboard/finances/budget/budget-detail/budget-detail.component.ts

import { Component, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';

import { BudgetStatus, BudgetUtils, BudgetStatusLabels, BudgetStatusColors } from '../../../../../core/models/Finances/budget.model';
import { BudgetResponseDto } from '../../../../../core/models/Finances/budget-statistics.model';
import { BudgetService } from '../../../../../core/services/Finances/budjets';

@Component({
  selector: 'app-budget-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './budget-detail.html',
  styleUrls: ['./budget-detail.scss'],
})
export class BudgetDetail implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private budgetService = inject(BudgetService);

  // ── État ──
  budget = signal<BudgetResponseDto | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  processing = signal(false);

  // ── Exposé des énumérations ──
  readonly BudgetStatus = BudgetStatus;

  // ── Helpers ──
  getStatusLabel = BudgetUtils.getStatusLabel;
  getStatusColor = BudgetUtils.getStatusColor;
  getFormattedDate = BudgetUtils.getFormattedDate;
  getFormattedDateTime = BudgetUtils.getFormattedDateTime;
  getFormattedCurrency = BudgetUtils.getFormattedCurrency;

  // ── Calculs dérivés ──
  canEdit = computed(() => {
    const b = this.budget();
    if (!b) return false;
    return b.status === BudgetStatus.Draft || b.status === BudgetStatus.Pending;
  });

  canApprove = computed(() => {
    const b = this.budget();
    if (!b) return false;
    return b.status === BudgetStatus.Draft || b.status === BudgetStatus.Pending;
  });

  canReject = computed(() => {
    const b = this.budget();
    if (!b) return false;
    return b.status === BudgetStatus.Pending;
  });

  canClose = computed(() => {
    const b = this.budget();
    if (!b) return false;
    return b.status === BudgetStatus.Approved;
  });

  canDelete = computed(() => {
    const b = this.budget();
    if (!b) return false;
    return b.status === BudgetStatus.Draft;
  });

  totalAllocated = computed(() => this.budget()?.totalBudget || 0);
  totalSpent = computed(() => this.budget()?.totalSpent || 0);
  totalRemaining = computed(() => this.budget()?.totalRemaining || 0);
  utilizationRate = computed(() => this.budget()?.utilizationRate || 0);

  // ── Modal ──
  showModal = signal(false);
  modalType = signal<'approve' | 'reject' | 'close' | 'delete'>('delete');
  rejectReason = signal('');

  // ── Couleurs ──
  getStatusClass(status: BudgetStatus): string {
    const color = BudgetStatusColors[status] || 'secondary';
    return `bd-badge-${color}`;
  }

  getUtilizationColor(rate: number): string {
    if (rate >= 90) return 'danger';
    if (rate >= 70) return 'warning';
    if (rate >= 40) return 'info';
    return 'success';
  }

  constructor() {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Identifiant du budget manquant.');
      this.loading.set(false);
      return;
    }
    this.loadBudget(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT
  // ──────────────────────────────────────────────────────────────

  private loadBudget(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.budgetService.getById(id).subscribe({
      next: (response: { success: any; data: any; message: any; }) => {
        if (response.success && response.data) {
          this.budget.set(response.data);
        } else {
          this.error.set(response.message || 'Impossible de charger le budget.');
        }
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('❌ Erreur chargement:', err);
        this.error.set('Erreur lors du chargement du budget.');
        this.loading.set(false);
      },
    });
  }

  // ──────────────────────────────────────────────────────────────
  // ACTIONS
  // ──────────────────────────────────────────────────────────────

  goBack(): void {
    this.router.navigate(['/dashboard/finances/budget']);
  }

  editBudget(): void {
    const b = this.budget();
    if (b) {
      this.router.navigate(['/dashboard/finances/budget', b.id, 'edit']);
    }
  }

  openModal(type: 'approve' | 'reject' | 'close' | 'delete'): void {
    this.modalType.set(type);
    this.rejectReason.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.processing.set(false);
    this.rejectReason.set('');
  }

  confirmAction(): void {
  const b = this.budget();
  if (!b) return;

  this.processing.set(true);

  const action$: Observable<any> | null = (() => {
    switch (this.modalType()) {
      case 'approve':
        return this.budgetService.approveBudget(b.id);
      case 'reject':
        return this.budgetService.rejectBudget(b.id, this.rejectReason() || undefined);
      case 'close':
        return this.budgetService.closeBudget(b.id);
      case 'delete':
        return this.budgetService.delete(b.id);
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
        this.loadBudget(b.id);
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

  print(): void {
    window.print();
  }
}
