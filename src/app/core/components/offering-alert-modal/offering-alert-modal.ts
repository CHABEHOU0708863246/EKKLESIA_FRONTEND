import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Service as WorshipService } from '../../services/Worship/service';
import { Permissions } from '../../services/Permissions/permissions';
import { OfferingAlert } from '../../models/Events/service.model';

/**
 * Rappel global Â« culte sans offrande Â» (Lot 4).
 *
 * AffichÃ© Ã  chaque navigation (sauf sur le formulaire d'offrande), il liste
 * les cultes terminÃ©s des 60 derniers jours sans offrande comptabilisable.
 * Les donnÃ©es viennent du serveur ; le bouton Â« Plus tard Â» ferme la fenÃªtre
 * jusqu'Ã  la navigation suivante.
 */
@Component({
  selector: 'app-offering-alert-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './offering-alert-modal.html',
  styleUrl: './offering-alert-modal.scss',
})
export class OfferingAlertModal {
  private readonly worship = inject(WorshipService);
  private readonly router = inject(Router);
  private readonly permissions = inject(Permissions);

  readonly isOpen = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly items = signal<OfferingAlert[]>([]);
  readonly declaringId = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  /** Motif saisi (liaison ngModel : propriÃ©tÃ© simple, pas un signal). */
  reasonText = '';

  /** DerniÃ¨re URL visitÃ©e (utile pour ne pas rouvrir sur le formulaire). */
  private lastUrl = '';

  /** AppelÃ© par le shell Ã  chaque NavigationEnd. */
  onNavigation(url: string): void {
    this.lastUrl = url;
    const path = (url || '').split('?')[0];

    // Ne jamais gÃªner la saisie de l'offrande elle-mÃªme.
    if (this.isOfferingForm(path)) {
      this.isOpen.set(false);
      return;
    }

    if (!this.canViewAlerts()) return;
    void this.load();
  }

  private isOfferingForm(path: string): boolean {
    return (
      path.includes('/dashboard/offrandes/new') ||
      /\/dashboard\/offrandes\/[^/]+\/edit/.test(path)
    );
  }

  private canViewAlerts(): boolean {
    return this.permissions.hasAnyPermission(
      'Finance_Offering_Create',
      'Finance_Offering_Validate',
      'Service_Update'
    );
  }

  async load(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);

    this.worship.getOfferingAlerts().subscribe({
      next: (response: any) => {
        const items = (response?.items ?? response?.data?.items ?? []) as OfferingAlert[];
        this.items.set(items);
        this.isOpen.set(items.length > 0);
        if (items.length === 0) this.resetDeclaration();
        this.loading.set(false);
      },
      error: () => {
        // 403 / rÃ©seau : le rappel ne doit jamais gÃªner l'application.
        this.loading.set(false);
      },
    });
  }

  /** Ferme la fenÃªtre ; elle rÃ©apparaÃ®tra Ã  la navigation suivante. */
  later(): void {
    this.isOpen.set(false);
    this.resetDeclaration();
  }

  /** Affiche la saisie du motif pour un culte. */
  askDeclare(item: OfferingAlert): void {
    this.declaringId.set(item.id);
    this.reasonText = '';
    this.error.set(null);
  }

  cancelDeclare(): void {
    this.resetDeclaration();
  }

  /** Â« Aucune offrande Â» : motif obligatoire (10 Ã  500 caractÃ¨res). */
  confirmDeclare(item: OfferingAlert): void {
    const reason = (this.reasonText || '').trim();
    if (reason.length < 10 || reason.length > 500) {
      this.error.set('Le motif est obligatoire (10 Ã  500 caractÃ¨res).');
      return;
    }

    this.saving.set(true);
    this.worship.declareNoOffering(item.id, reason).subscribe({
      next: (response: any) => {
        this.saving.set(false);

        if (response?.success === false) {
          this.error.set(
            response?.errorMessage ?? response?.message ?? 'DÃ©claration impossible.'
          );
          return;
        }

        const remaining = this.items().filter((i) => i.id !== item.id);
        this.items.set(remaining);
        this.resetDeclaration();
        if (remaining.length === 0) this.isOpen.set(false);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(
          err?.error?.message ??
            err?.error?.errorMessage ??
            'DÃ©claration impossible. Veuillez rÃ©essayer.'
        );
      },
    });
  }

  /** Ouvre le formulaire d'offrande avec le culte prÃ©sÃ©lectionnÃ©. */
  enregistrer(item: OfferingAlert): void {
    this.isOpen.set(false);
    this.resetDeclaration();
    void this.router.navigate(['/dashboard/offrandes/new'], {
      queryParams: { serviceId: item.id },
    });
  }

  private resetDeclaration(): void {
    this.declaringId.set(null);
    this.reasonText = '';
    this.error.set(null);
    this.saving.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) this.later();
  }
}
