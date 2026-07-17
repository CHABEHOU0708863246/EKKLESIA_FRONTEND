// src/app/features/dashboard/finances/offerings/offering-list/offering-list.component.ts

import { Component, OnDestroy, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { Offering, OfferingFilter, OfferingStatus, OfferingType, DEFAULT_OFFERING_FILTER } from '../../../../../core/models/Finances/offering.model';
import { OfferingUtils } from '../../../../../core/models/Finances/offering.model';
import { OfferingTypeLabels, OfferingTypeIcons, OfferingTypeColors, OfferingStatusLabels, OfferingStatusColors } from '../../../../../core/models/Finances/offering.model';
import { Offerings } from '../../../../../core/services/Finances/offerings';

const TYPE_OPTIONS = Object.values(OfferingType).map((value) => ({
  value,
  label: OfferingTypeLabels[value],
  icon: OfferingTypeIcons[value],
}));

const STATUS_OPTIONS = Object.values(OfferingStatus).map((value) => ({
  value,
  label: OfferingStatusLabels[value],
}));

@Component({
  selector: 'app-offering-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './offering-list.html',
  styleUrls: ['./offering-list.scss'],
})
export class OfferingList implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private offeringsService = inject(Offerings);
  private router = inject(Router);
  readonly OfferingStatus = OfferingStatus;
  readonly OfferingType = OfferingType;

  // ── État ──
  offerings = signal<Offering[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  totalCount = signal(0);
  currentPage = signal(1);
  pageSize = signal(20);
  totalPages = signal(1);

  // ── Filtres ──
  searchControl = new FormControl('');
  typeControl = new FormControl('');
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

  // ── Suppression ──
  deleteDialogVisible = signal(false);
  offeringToDelete = signal<Offering | null>(null);
  deleting = signal(false);

  // ── Utilitaires ──
  getTypeLabel = OfferingUtils.getTypeLabel;
  getTypeIcon = OfferingUtils.getTypeIcon;
  getTypeColor = OfferingUtils.getTypeColor;
  getStatusLabel = OfferingUtils.getStatusLabel;
  getStatusColor = OfferingUtils.getStatusColor;
  getPaymentMethodLabel = OfferingUtils.getPaymentMethodLabel;
  getFormattedDate = OfferingUtils.getFormattedDate;
  getFormattedCurrency = OfferingUtils.getFormattedCurrency;

  readonly typeOptions = TYPE_OPTIONS;
  readonly statusOptions = STATUS_OPTIONS;
  readonly pageSizeOptions = [10, 20, 50, 100];

  constructor() {}

  ngOnInit(): void {
    this.loadStats();
    this.loadOfferings();

    // Recherche textuelle
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadOfferings();
      });

    // Filtres
    [this.typeControl, this.statusControl, this.dateFromControl, this.dateToControl].forEach((control) => {
      control.valueChanges
        .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
        .subscribe(() => {
          this.currentPage.set(1);
          this.loadOfferings();
        });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT DES DONNÉES
  // ──────────────────────────────────────────────────────────────

  loadOfferings(): void {
    this.loading.set(true);
    this.error.set(null);

    const filter: OfferingFilter = {
      ...DEFAULT_OFFERING_FILTER,
      page: this.currentPage(),
      pageSize: this.pageSize(),
      memberId: this.searchControl.value || undefined,
      type: this.typeControl.value as OfferingType || undefined,
      status: this.statusControl.value as OfferingStatus || undefined,
      dateFrom: this.dateFromControl.value || undefined,
      dateTo: this.dateToControl.value || undefined,
    };

    this.offeringsService.getAll(filter).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.offerings.set(response.data.items || []);
          this.totalCount.set(response.data.totalCount || 0);
          this.currentPage.set(response.data.currentPage || 1);
          this.totalPages.set(response.data.totalPages || 1);
        } else {
          this.offerings.set([]);
          this.totalCount.set(0);
          this.error.set(response.message || 'Impossible de charger les offrandes.');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Erreur chargement offrandes:', err);
        this.offerings.set([]);
        this.loading.set(false);
        this.error.set('Erreur lors du chargement des offrandes.');
      },
    });
  }

  loadStats(): void {
    this.statsLoading.set(true);
    this.offeringsService.getStatistics().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.stats.set(response.data);
        }
        this.statsLoading.set(false);
      },
      error: () => {
        this.statsLoading.set(false);
      },
    });
  }

  refresh(): void {
    this.loadStats();
    this.loadOfferings();
  }

  resetFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.typeControl.setValue('', { emitEvent: false });
    this.statusControl.setValue('', { emitEvent: false });
    this.dateFromControl.setValue('', { emitEvent: false });
    this.dateToControl.setValue('', { emitEvent: false });
    this.currentPage.set(1);
    this.loadOfferings();
  }

  // ──────────────────────────────────────────────────────────────
  // PAGINATION
  // ──────────────────────────────────────────────────────────────

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadOfferings();
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
    this.loadOfferings();
  }

  // ──────────────────────────────────────────────────────────────
  // ACTIONS
  // ──────────────────────────────────────────────────────────────

  viewOffering(offering: Offering): void {
    this.router.navigate(['/dashboard/offrandes', offering.id]);
  }

  editOffering(offering: Offering, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/dashboard/offrandes', offering.id, 'edit']);
  }

  validateOffering(offering: Offering, event: Event): void {
    event.stopPropagation();
    if (offering.status === OfferingStatus.Validated) return;
    this.offeringsService.validateOffering(offering.id, { offeringId: offering.id, validated: true }).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadOfferings();
          this.loadStats();
        } else {
          this.error.set(response.message || 'Erreur lors de la validation.');
        }
      },
      error: (err) => {
        console.error('❌ Erreur validation:', err);
        this.error.set('Erreur lors de la validation.');
      },
    });
  }

  generateReceipt(offering: Offering, event: Event): void {
    event.stopPropagation();
    if (offering.receiptGenerated || offering.status !== OfferingStatus.Validated) return;
    this.offeringsService.generateReceipt(offering.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadOfferings();
        } else {
          this.error.set(response.message || 'Erreur lors de la génération du reçu.');
        }
      },
      error: (err) => {
        console.error('❌ Erreur génération reçu:', err);
        this.error.set('Erreur lors de la génération du reçu.');
      },
    });
  }

  downloadReceipt(offering: Offering, event: Event): void {
    event.stopPropagation();
    if (!offering.receiptGenerated || !offering.receiptNumber) return;
    this.offeringsService.getReceiptPdf(offering.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `recu_${offering.receiptNumber}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('❌ Erreur téléchargement reçu:', err);
        this.error.set('Impossible de télécharger le reçu.');
      },
    });
  }

  requestDelete(offering: Offering, event: Event): void {
    event.stopPropagation();
    this.offeringToDelete.set(offering);
    this.deleteDialogVisible.set(true);
  }

  confirmDelete(): void {
    const offering = this.offeringToDelete();
    if (!offering) return;

    this.deleting.set(true);
    this.offeringsService.delete(offering.id).subscribe({
      next: (response) => {
        this.deleting.set(false);
        this.deleteDialogVisible.set(false);
        this.offeringToDelete.set(null);
        if (response.success) {
          this.loadOfferings();
          this.loadStats();
        } else {
          this.error.set(response.message || 'Impossible de supprimer cette offrande.');
        }
      },
      error: (err) => {
        console.error('❌ Erreur suppression:', err);
        this.deleting.set(false);
        this.deleteDialogVisible.set(false);
        this.offeringToDelete.set(null);
        this.error.set('Impossible de supprimer cette offrande.');
      },
    });
  }

  cancelDelete(): void {
    this.deleteDialogVisible.set(false);
    this.offeringToDelete.set(null);
  }

  // ──────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────

  getStatusClass(status: OfferingStatus): string {
    const color = OfferingStatusColors[status] || 'secondary';
    return `ol-badge-${color}`;
  }

  getTypeClass(type: OfferingType): string {
    const color = OfferingTypeColors[type] || 'secondary';
    return `ol-type-${color}`;
  }

  getTotalAmount(): number {
    const stats = this.stats();
    return stats?.totalAmount || 0;
  }
}
