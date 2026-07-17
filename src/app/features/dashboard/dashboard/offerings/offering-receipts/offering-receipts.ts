// src/app/features/dashboard/finances/offerings/offering-receipts/offering-receipts.component.ts

import { Component, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { Offering, OfferingFilter, OfferingStatus, OfferingType, DEFAULT_OFFERING_FILTER } from '../../../../../core/models/Finances/offering.model';
import { OfferingUtils } from '../../../../../core/models/Finances/offering.model';
import { OfferingTypeLabels, OfferingTypeIcons, OfferingTypeColors } from '../../../../../core/models/Finances/offering.model';
import { Offerings } from '../../../../../core/services/Finances/offerings';

const TYPE_OPTIONS = Object.values(OfferingType).map((value) => ({
  value,
  label: OfferingTypeLabels[value],
  icon: OfferingTypeIcons[value],
}));

@Component({
  selector: 'app-offering-receipts',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './offering-receipts.html',
  styleUrls: ['./offering-receipts.scss'],
})
export class OfferingReceipts implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private offeringsService = inject(Offerings);
  private router = inject(Router);

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
  dateFromControl = new FormControl('');
  dateToControl = new FormControl('');

  // ── Exposé des utilitaires ──
  readonly typeOptions = TYPE_OPTIONS;
  readonly pageSizeOptions = [10, 20, 50, 100];

  // ── Helpers ──
  getTypeLabel = OfferingUtils.getTypeLabel;
  getTypeIcon = OfferingUtils.getTypeIcon;
  getTypeColor = OfferingUtils.getTypeColor;
  getStatusLabel = OfferingUtils.getStatusLabel;
  getStatusColor = OfferingUtils.getStatusColor;
  getPaymentMethodLabel = OfferingUtils.getPaymentMethodLabel;
  getFormattedDate = OfferingUtils.getFormattedDate;
  getFormattedCurrency = OfferingUtils.getFormattedCurrency;

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

  constructor() {}

  ngOnInit(): void {
    this.loadReceipts();

    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadReceipts();
      });

    [this.typeControl, this.dateFromControl, this.dateToControl].forEach((ctrl) => {
      ctrl.valueChanges
        .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
        .subscribe(() => {
          this.currentPage.set(1);
          this.loadReceipts();
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

  loadReceipts(): void {
    this.loading.set(true);
    this.error.set(null);

    const filter: OfferingFilter = {
      ...DEFAULT_OFFERING_FILTER,
      page: this.currentPage(),
      pageSize: this.pageSize(),
      receiptGenerated: true, // ✅ Seulement les offrandes avec reçu
      type: this.typeControl.value as OfferingType || undefined,
      dateFrom: this.dateFromControl.value || undefined,
      dateTo: this.dateToControl.value || undefined,
    };

    // Si recherche textuelle, on l'applique sur memberName ou receiptNumber
    const search = this.searchControl.value?.trim();
    if (search) {
      // On ne peut pas filtrer côté serveur sur memberName/receiptNumber
      // On récupère tout et on filtre côté client
      filter.page = 1;
      filter.pageSize = 1000; // Récupérer tous pour filtrage client
    }

    this.offeringsService.getAll(filter).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          let items = response.data.items || [];
          const search = this.searchControl.value?.trim();
          if (search) {
            // Filtrage client
            items = items.filter(o =>
              (o.memberName && o.memberName.toLowerCase().includes(search.toLowerCase())) ||
              (o.receiptNumber && o.receiptNumber.toLowerCase().includes(search.toLowerCase()))
            );
            // Mise à jour des stats de pagination après filtrage
            this.totalCount.set(items.length);
            this.totalPages.set(1);
            this.currentPage.set(1);
            this.offerings.set(items);
          } else {
            this.offerings.set(items);
            this.totalCount.set(response.data.totalCount || 0);
            this.currentPage.set(response.data.currentPage || 1);
            this.totalPages.set(response.data.totalPages || 1);
          }
        } else {
          this.offerings.set([]);
          this.totalCount.set(0);
          this.error.set(response.message || 'Impossible de charger les reçus.');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Erreur chargement reçus:', err);
        this.offerings.set([]);
        this.loading.set(false);
        this.error.set('Erreur lors du chargement des reçus.');
      },
    });
  }

  refresh(): void {
    this.loadReceipts();
  }

  resetFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.typeControl.setValue('', { emitEvent: false });
    this.dateFromControl.setValue('', { emitEvent: false });
    this.dateToControl.setValue('', { emitEvent: false });
    this.currentPage.set(1);
    this.loadReceipts();
  }

  // ──────────────────────────────────────────────────────────────
  // PAGINATION
  // ──────────────────────────────────────────────────────────────

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadReceipts();
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
    this.loadReceipts();
  }

  // ──────────────────────────────────────────────────────────────
  // ACTIONS
  // ──────────────────────────────────────────────────────────────

  downloadReceipt(offering: Offering, event: Event): void {
    event.stopPropagation();
    if (!offering.receiptNumber) return;

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

  viewOffering(offering: Offering): void {
    this.router.navigate(['/dashboard/offrandes', offering.id]);
  }

  // ──────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────

  getTypeColorClass(type: OfferingType): string {
    const colors: Record<OfferingType, string> = {
      [OfferingType.Tithe]: 'primary',
      [OfferingType.SundayOffering]: 'success',
      [OfferingType.SpecialOffering]: 'warning',
      [OfferingType.BuildingFund]: 'info',
      [OfferingType.Mission]: 'purple',
      [OfferingType.Seed]: 'teal',
      [OfferingType.Thanksgiving]: 'orange',
      [OfferingType.Other]: 'secondary'
    };
    return `or-type-${colors[type] || 'secondary'}`;
  }

  getStatusClass(status: OfferingStatus): string {
    const colors: Record<OfferingStatus, string> = {
      [OfferingStatus.Pending]: 'warning',
      [OfferingStatus.Verified]: 'info',
      [OfferingStatus.Validated]: 'success',
      [OfferingStatus.Cancelled]: 'danger'
    };
    return `or-badge-${colors[status] || 'secondary'}`;
  }

  downloadAllAsZip(): void {
    // Optionnel : télécharger tous les reçus en archive zip
    // À implémenter avec un service côté backend ou avec JSZip
    this.error.set('Fonctionnalité à venir.');
  }
}
