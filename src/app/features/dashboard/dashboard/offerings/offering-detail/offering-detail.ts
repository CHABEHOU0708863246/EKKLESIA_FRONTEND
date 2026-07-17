// src/app/features/dashboard/finances/offerings/offering-detail/offering-detail.component.ts

import { Component, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Offering, OfferingStatus, OfferingType } from '../../../../../core/models/Finances/offering.model';
import { OfferingUtils } from '../../../../../core/models/Finances/offering.model';
import { OfferingStatusLabels, OfferingStatusColors, OfferingTypeLabels, OfferingTypeIcons } from '../../../../../core/models/Finances/offering.model';
import { Offerings } from '../../../../../core/services/Finances/offerings';
import { PaymentMethod } from '../../../../../core/models/Finances/expense.model';

@Component({
  selector: 'app-offering-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './offering-detail.html',
  styleUrls: ['./offering-detail.scss'],
})
export class OfferingDetail implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private offeringsService = inject(Offerings);

  // ── État ──
  offering = signal<Offering | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  deleting = signal(false);
  validating = signal(false);
  generatingReceipt = signal(false);

  // ── Exposé des énumérations au template ──
  readonly OfferingStatus = OfferingStatus;
  readonly OfferingType = OfferingType;
  readonly PaymentMethod = PaymentMethod;

  // ── Helpers ──
  getStatusLabel = OfferingUtils.getStatusLabel;
  getStatusColor = OfferingUtils.getStatusColor;
  getTypeLabel = OfferingUtils.getTypeLabel;
  getTypeIcon = OfferingUtils.getTypeIcon;
  getPaymentMethodLabel = OfferingUtils.getPaymentMethodLabel;
  getFormattedDate = OfferingUtils.getFormattedDate;
  getFormattedDateTime = OfferingUtils.getFormattedDateTime;
  getFormattedCurrency = OfferingUtils.getFormattedCurrency;

  // ── Calculs dérivés ──
  canEdit = computed(() => {
    const o = this.offering();
    if (!o) return false;
    return o.status !== OfferingStatus.Validated && o.status !== OfferingStatus.Cancelled;
  });

  canValidate = computed(() => {
    const o = this.offering();
    if (!o) return false;
    return o.status === OfferingStatus.Pending || o.status === OfferingStatus.Verified;
  });

  canGenerateReceipt = computed(() => {
    const o = this.offering();
    if (!o) return false;
    return o.status === OfferingStatus.Validated && !o.receiptGenerated;
  });

  canDownloadReceipt = computed(() => {
    const o = this.offering();
    if (!o) return false;
    return o.receiptGenerated && !!o.receiptNumber;
  });

  canCancel = computed(() => {
    const o = this.offering();
    if (!o) return false;
    return o.status !== OfferingStatus.Validated && o.status !== OfferingStatus.Cancelled;
  });

  canDelete = computed(() => {
    const o = this.offering();
    if (!o) return false;
    return o.status !== OfferingStatus.Validated;
  });

  // ── Couleurs de statut ──
  getStatusClass(status: OfferingStatus): string {
    const color = OfferingStatusColors[status] || 'secondary';
    return `od-badge-${color}`;
  }

  getTypeClass(type: OfferingType): string {
    const colors: Record<OfferingType, string> = {
      [OfferingType.Tithe]: 'primary',
      [OfferingType.SundayOffering]: 'success',
      [OfferingType.SpecialOffering]: 'warning',
      [OfferingType.BuildingFund]: 'info',
      [OfferingType.Mission]: 'purple',
      [OfferingType.Seed]: 'teal',
      [OfferingType.Thanksgiving]: 'orange',
      [OfferingType.Other]: 'secondary',
    };
    return `od-type-${colors[type] || 'secondary'}`;
  }

  constructor() {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Identifiant de l\'offrande manquant.');
      this.loading.set(false);
      return;
    }
    this.loadOffering(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT
  // ──────────────────────────────────────────────────────────────

  private loadOffering(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.offeringsService.getById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.offering.set(response.data);
        } else {
          this.error.set(response.message || 'Impossible de charger l\'offrande.');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Erreur chargement:', err);
        this.error.set('Erreur lors du chargement de l\'offrande.');
        this.loading.set(false);
      },
    });
  }

  // ──────────────────────────────────────────────────────────────
  // ACTIONS
  // ──────────────────────────────────────────────────────────────

  goBack(): void {
    this.router.navigate(['/dashboard/offrandes']);
  }

  editOffering(): void {
    const o = this.offering();
    if (o) {
      this.router.navigate(['/dashboard/offrandes', o.id, 'edit']);
    }
  }

  validateOffering(): void {
    const o = this.offering();
    if (!o) return;

    if (confirm(`Valider l'offrande de ${o.memberName || 'anonyme'} ?`)) {
      this.validating.set(true);
      this.offeringsService.validateOffering(o.id, {
        offeringId: o.id,
        validated: true,
        generateReceipt: false,
      }).subscribe({
        next: (response) => {
          this.validating.set(false);
          if (response.success && response.data) {
            this.offering.set(response.data);
          } else {
            this.error.set(response.message || 'Erreur lors de la validation.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur validation:', err);
          this.validating.set(false);
          this.error.set('Erreur lors de la validation.');
        },
      });
    }
  }

  generateReceipt(): void {
    const o = this.offering();
    if (!o) return;

    if (confirm('Générer un reçu pour cette offrande ?')) {
      this.generatingReceipt.set(true);
      this.offeringsService.generateReceipt(o.id).subscribe({
        next: (response) => {
          this.generatingReceipt.set(false);
          if (response.success && response.data) {
            this.offering.set(response.data);
          } else {
            this.error.set(response.message || 'Erreur lors de la génération du reçu.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur génération reçu:', err);
          this.generatingReceipt.set(false);
          this.error.set('Erreur lors de la génération du reçu.');
        },
      });
    }
  }

  downloadReceipt(): void {
    const o = this.offering();
    if (!o || !o.receiptNumber) return;

    this.offeringsService.getReceiptPdf(o.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `recu_${o.receiptNumber}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('❌ Erreur téléchargement:', err);
        this.error.set('Impossible de télécharger le reçu.');
      },
    });
  }

  cancelOffering(): void {
    const o = this.offering();
    if (!o) return;

    const reason = prompt('Raison de l\'annulation (facultatif) :');
    if (reason !== null) {
      this.validating.set(true);
      this.offeringsService.cancelOffering(o.id, reason || undefined).subscribe({
        next: (response) => {
          this.validating.set(false);
          if (response.success && response.data) {
            this.offering.set(response.data);
          } else {
            this.error.set(response.message || 'Erreur lors de l\'annulation.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur annulation:', err);
          this.validating.set(false);
          this.error.set('Erreur lors de l\'annulation.');
        },
      });
    }
  }

  deleteOffering(): void {
    const o = this.offering();
    if (!o) return;

    if (confirm(`Supprimer définitivement l'offrande de ${o.memberName || 'anonyme'} ?`)) {
      this.deleting.set(true);
      this.offeringsService.delete(o.id).subscribe({
        next: (response) => {
          this.deleting.set(false);
          if (response.success) {
            this.router.navigate(['/dashboard/offrandes']);
          } else {
            this.error.set(response.message || 'Erreur lors de la suppression.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur suppression:', err);
          this.deleting.set(false);
          this.error.set('Erreur lors de la suppression.');
        },
      });
    }
  }

  print(): void {
    window.print();
  }
}
