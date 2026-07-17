// src/app/features/dashboard/finances/expenses/expense-detail/expense-detail.component.ts

import { Component, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  Expense,
  ExpenseStatus,
  ExpenseCategory,
  PaymentMethod,
  ExpenseUtils,
  ExpenseCategoryLabels,
  ExpenseCategoryIcons,
  ExpenseStatusLabels,
  ExpenseStatusColors,
  PaymentMethodLabels
} from '../../../../../core/models/Finances/expense.model';
import { Expenses } from '../../../../../core/services/Finances/expenses';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-expense-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './expense-detail.html',
  styleUrls: ['./expense-detail.scss'],
})
export class ExpenseDetail implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private expensesService = inject(Expenses);

  // ── État ──
  expense = signal<Expense | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  processing = signal(false);
  showRejectModal = signal(false);
  rejectReason = signal('');

  // ── Exposé des énumérations au template ──
  readonly ExpenseStatus = ExpenseStatus;
  readonly ExpenseCategory = ExpenseCategory;
  readonly PaymentMethod = PaymentMethod;

  // ── Helpers ──
  getCategoryLabel = ExpenseUtils.getCategoryLabel;
  getCategoryIcon = ExpenseUtils.getCategoryIcon;
  getStatusLabel = ExpenseUtils.getStatusLabel;
  getStatusColor = ExpenseUtils.getStatusColor;
  getPaymentMethodLabel = ExpenseUtils.getPaymentMethodLabel;
  getFormattedDate = ExpenseUtils.getFormattedDate;
  getFormattedDateTime = ExpenseUtils.getFormattedDateTime;
  getFormattedCurrency = ExpenseUtils.getFormattedCurrency;

  // ── Calculs dérivés pour les actions ──
  canEdit = computed(() => {
    const e = this.expense();
    if (!e) return false;
    return e.status === ExpenseStatus.Draft || e.status === ExpenseStatus.Pending;
  });

  canApprove = computed(() => {
    const e = this.expense();
    if (!e) return false;
    return e.status === ExpenseStatus.Pending;
  });

  canReject = computed(() => {
    const e = this.expense();
    if (!e) return false;
    return e.status === ExpenseStatus.Pending;
  });

  canMarkPaid = computed(() => {
    const e = this.expense();
    if (!e) return false;
    return e.status === ExpenseStatus.Approved;
  });

  canCancel = computed(() => {
    const e = this.expense();
    if (!e) return false;
    return e.status !== ExpenseStatus.Paid && e.status !== ExpenseStatus.Rejected && e.status !== ExpenseStatus.Cancelled;
  });

  canDelete = computed(() => {
    const e = this.expense();
    if (!e) return false;
    return e.status === ExpenseStatus.Draft || e.status === ExpenseStatus.Pending;
  });

  canPrint = computed(() => true);

  // ── Couleurs des statuts ──
  getStatusClass(status: ExpenseStatus): string {
    const color = ExpenseStatusColors[status] || 'secondary';
    return `ed-badge-${color}`;
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
    return `ed-category-${colors[category] || 'secondary'}`;
  }

  constructor() {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Identifiant de la dépense manquant.');
      this.loading.set(false);
      return;
    }
    this.loadExpense(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT
  // ──────────────────────────────────────────────────────────────

  private loadExpense(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.expensesService.getById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.expense.set(response.data);
        } else {
          this.error.set(response.message || 'Impossible de charger la dépense.');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Erreur chargement:', err);
        this.error.set('Erreur lors du chargement de la dépense.');
        this.loading.set(false);
      },
    });
  }

  // ──────────────────────────────────────────────────────────────
  // ACTIONS
  // ──────────────────────────────────────────────────────────────

  goBack(): void {
    this.router.navigate(['/dashboard/finances/depenses']);
  }

  editExpense(): void {
    const e = this.expense();
    if (e) {
      this.router.navigate(['/dashboard/finances/depenses', e.id, 'edit']);
    }
  }

  approveExpense(): void {
    const e = this.expense();
    if (!e) return;
    this.processing.set(true);
    this.expensesService.approveExpense(e.id, { expenseId: e.id, approved: true }).subscribe({
      next: (response) => {
        this.processing.set(false);
        if (response.success && response.data) {
          this.expense.set(response.data);
        } else {
          this.error.set(response.message || 'Erreur lors de l\'approbation.');
        }
      },
      error: (err) => {
        console.error('❌ Erreur approbation:', err);
        this.processing.set(false);
        this.error.set('Erreur lors de l\'approbation.');
      },
    });
  }

  openRejectModal(): void {
    this.rejectReason.set('');
    this.showRejectModal.set(true);
  }

  rejectExpense(): void {
    const e = this.expense();
    if (!e) return;
    this.processing.set(true);
    this.showRejectModal.set(false);
    this.expensesService.approveExpense(e.id, { expenseId: e.id, approved: false, comment: this.rejectReason() || undefined }).subscribe({
      next: (response) => {
        this.processing.set(false);
        if (response.success && response.data) {
          this.expense.set(response.data);
        } else {
          this.error.set(response.message || 'Erreur lors du rejet.');
        }
      },
      error: (err) => {
        console.error('❌ Erreur rejet:', err);
        this.processing.set(false);
        this.error.set('Erreur lors du rejet.');
      },
    });
  }

  markAsPaid(): void {
    const e = this.expense();
    if (!e) return;
    this.processing.set(true);
    this.expensesService.markAsPaid(e.id).subscribe({
      next: (response) => {
        this.processing.set(false);
        if (response.success && response.data) {
          this.expense.set(response.data);
        } else {
          this.error.set(response.message || 'Erreur lors du marquage comme payée.');
        }
      },
      error: (err) => {
        console.error('❌ Erreur marquage payé:', err);
        this.processing.set(false);
        this.error.set('Erreur lors du marquage comme payée.');
      },
    });
  }

  cancelExpense(): void {
    const e = this.expense();
    if (!e) return;
    const reason = prompt('Raison de l\'annulation (facultatif) :');
    if (reason !== null) {
      this.processing.set(true);
      this.expensesService.cancelExpense(e.id, reason || undefined).subscribe({
        next: (response) => {
          this.processing.set(false);
          if (response.success && response.data) {
            this.expense.set(response.data);
          } else {
            this.error.set(response.message || 'Erreur lors de l\'annulation.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur annulation:', err);
          this.processing.set(false);
          this.error.set('Erreur lors de l\'annulation.');
        },
      });
    }
  }

  deleteExpense(): void {
    const e = this.expense();
    if (!e) return;
    if (confirm(`Supprimer définitivement la dépense "${e.title}" ?`)) {
      this.processing.set(true);
      this.expensesService.delete(e.id).subscribe({
        next: (response) => {
          this.processing.set(false);
          if (response.success) {
            this.router.navigate(['/dashboard/finances/depenses']);
          } else {
            this.error.set(response.message || 'Erreur lors de la suppression.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur suppression:', err);
          this.processing.set(false);
          this.error.set('Erreur lors de la suppression.');
        },
      });
    }
  }

  print(): void {
    window.print();
  }
}
