// src/app/features/dashboard/services/service-detail/service-detail.component.ts

import { Component, OnDestroy, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ServiceUtils } from '../../../../../core/models/Events/service.model';
import { Users } from '../../../../../core/services/Users/users';
import { Service } from '../../../../../core/services/Worship/service';
import { Church } from '../../../../../core/services/Church/church';
import { environment } from '../../../../../../environments/environment.development';
import { AuthImageDirective } from '../../../../../core/directives/auth-image.directive';
import { ServiceDonation } from '../../../../../core/models/Donations/donation.model';


@Component({
  selector: 'app-service-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, AuthImageDirective],
  templateUrl: './service-detail.html',
  styleUrls: ['./service-detail.scss'],
})
export class ServiceDetail implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public serviceService = inject(Service);
  public userService = inject(Users);
  private churchService = inject(Church);
  /** Photos justificatives chargées (1 à 5) — RG-PHOTO. */
  photoItems = signal<{ id: string; url: string }[]>([]);
  preacherPhotoObjectUrl = signal<string | null>(null);
  photoLoadFailed = signal(false);

  service = signal<any | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  deleting = signal(false);

  // ── Dons en ligne du culte (Live Stream) ──
  donations = signal<ServiceDonation[]>([]);
  donationsTotal = signal(0);
  loadingDonations = signal(false);

  // Helpers
  getStatusLabel = ServiceUtils.getStatusLabel;
  getStatusColor = ServiceUtils.getStatusColor;
  getFormattedDate = ServiceUtils.getFormattedDate;

  constructor() { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Identifiant du culte manquant.');
      this.loading.set(false);
      return;
    }
    this.loadService(id);
  }


  /** Charge 0 à 5 photos (RG-PHOTO) et construit les URL objets pour l'aperçu. */
  private loadServicePhotos(photoIds: string[]): void {
    if (!photoIds?.length) return;
    this.photoLoadFailed.set(false);
    this.photoItems.set([]);

    for (const photoId of photoIds) {
      if (!photoId) continue;
      this.serviceService.getPhoto(photoId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (blob) => {
            const url = URL.createObjectURL(blob);
            this.photoItems.update((list) => [...list, { id: photoId, url }]);
          },
          error: (err) => {
            console.error('❌ Erreur chargement photo culte:', err);
            this.photoLoadFailed.set(true);
          },
        });
    }
  }

   ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // ✅ Libérer les URL objets pour éviter les fuites mémoire
    for (const item of this.photoItems()) {
      URL.revokeObjectURL(item.url);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT DU CULTE
  // ──────────────────────────────────────────────────────────────

  private loadService(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.serviceService
      .getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          let data = null;
          if (response && typeof response === 'object') {
            if (response.success && response.data) {
              data = response.data;
            } else if (response.id) {
              data = response;
            }
          }

          if (data) {
            this.enrichServiceData(data);
          } else {
            this.error.set('Impossible de charger ce culte.');
            this.loading.set(false);
          }
        },
        error: (err) => {
          console.error('❌ Erreur chargement détail:', err);
          this.error.set('Erreur lors du chargement du culte.');
          this.loading.set(false);
        },
      });
  }


  private enrichServiceData(service: any): void {
    // Récupérer le nom de l'église
    if (service.churchId && !service.churchName) {
      this.churchService.getChurchById(service.churchId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              service.churchName = response.data.name;
            }
            this.loadSiteName(service);
          },
          error: () => this.loadSiteName(service),
        });
    } else {
      this.loadSiteName(service);
    }
  }

  private loadSiteName(service: any): void {
    if (service.siteId && !service.siteName) {
      this.churchService.getSiteById(service.siteId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              service.siteName = response.data.name;
            }
            // ✅ Après chargement des noms, charger la photo
            this.finishLoading(service);
          },
          error: () => this.finishLoading(service),
        });
    } else {
      this.finishLoading(service);
    }
  }

  private finishLoading(service: any): void {
    this.service.set(service);
    // ✅ Charger les photos (1 à 5) — repli sur la photo unique héritée.
    const ids: string[] = Array.isArray(service.attendance?.photoUrls) && service.attendance.photoUrls.length
      ? service.attendance.photoUrls
      : (service.attendance?.photoUrl ? [service.attendance.photoUrl] : []);
    this.loadServicePhotos(ids);
    // ✅ Dons en ligne du culte (Live Stream)
    this.loadDonations(service.id);
    this.loading.set(false);
  }

  /** Dons/offrandes en ligne reçus pour ce culte (Live Stream). */
  private loadDonations(serviceId: string): void {
    if (!serviceId) return;
    this.loadingDonations.set(true);
    this.serviceService.getDonations(serviceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.donations.set(res?.data ?? []);
          this.donationsTotal.set(res?.total ?? 0);
          this.loadingDonations.set(false);
        },
        error: () => {
          this.donations.set([]);
          this.donationsTotal.set(0);
          this.loadingDonations.set(false);
        },
      });
  }

  /** Valide l'offrande liée à un don (Confirmer/Valider). */
  validatingIntent = signal<string | null>(null);
  exporting = signal(false);

  validateDonation(d: ServiceDonation): void {
    const sid = this.service()?.id;
    if (!sid || !d.intentId || this.validatingIntent()) return;
    this.validatingIntent.set(d.intentId);
    this.serviceService.validateDonation(sid, d.intentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.validatingIntent.set(null);
          this.loadDonations(sid);
        },
        error: () => {
          this.validatingIntent.set(null);
          this.error.set('Impossible de valider ce don.');
        },
      });
  }

  /** Export CSV des dons du culte. */
  exportDonations(): void {
    const sid = this.service()?.id;
    if (!sid || this.exporting()) return;
    this.exporting.set(true);
    this.serviceService.exportDonations(sid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.exporting.set(false);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `dons_culte_${sid}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => {
          this.exporting.set(false);
          this.error.set("Impossible d'exporter les dons.");
        },
      });
  }

  getDonationStatusLabel(status: string): string {
    const map: Record<string, string> = {
      Paid: 'Payé', Pending: 'En attente', Failed: 'Échoué', Cancelled: 'Annulé',
    };
    return map[status] ?? status;
  }

  getDonationStatusClass(status: string): string {
    const map: Record<string, string> = {
      Paid: 'is-paid', Pending: 'is-pending', Failed: 'is-failed', Cancelled: 'is-cancelled',
    };
    return map[status] ?? '';
  }


  // ──────────────────────────────────────────────────────────────
  // ACTIONS
  // ──────────────────────────────────────────────────────────────

  editService(): void {
    const s = this.service();
    if (s) {
      this.router.navigate(['/dashboard/cultes', s.id, 'edit']);
    }
  }

  goToCheckin(): void {
    const s = this.service();
    if (s) {
      this.router.navigate(['/dashboard/cultes', s.id, 'attendance']);
    }
  }

  deleteService(): void {
    const s = this.service();
    if (!s) return;

    if (confirm(`Voulez-vous vraiment supprimer le culte "${s.title}" ?`)) {
      this.deleting.set(true);
      this.serviceService
        .delete(s.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.deleting.set(false);
            if (response.success) {
              this.router.navigate(['/dashboard/cultes']);
            } else {
              this.error.set(response.message || 'Erreur lors de la suppression.');
            }
          },
          error: (err) => {
            console.error('❌ Erreur suppression:', err);
            this.deleting.set(false);
            this.error.set('Impossible de supprimer ce culte.');
          },
        });
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard/cultes']);
  }

  // ──────────────────────────────────────────────────────────────
  // MÉTHODES D'AFFICHAGE DES PRÉSENCES
  // ──────────────────────────────────────────────────────────────

  /**
   * Calcule le total avec enfants (utilisé si le backend ne l'a pas fourni)
   */
  getTotalWithChildren(attendance: any): number {
    if (!attendance) return 0;
    return (attendance.men || 0) + (attendance.women || 0) +
      (attendance.visitors || 0) + (attendance.children || 0);
  }

  /**
   * Calcule le total sans enfants (utilisé si le backend ne l'a pas fourni)
   */
  getTotalWithoutChildren(attendance: any): number {
    if (!attendance) return 0;
    return (attendance.men || 0) + (attendance.women || 0) + (attendance.visitors || 0);
  }

  /**
   * Ouvre la photo justificative dans un nouvel onglet
   */
  openPhoto(photoId: string): void {
    if (!photoId) return;

    this.serviceService.getPhoto(photoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const objectUrl = URL.createObjectURL(blob);
          window.open(objectUrl, '_blank');
          // Optionnel : libérer la mémoire après usage
          setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
        },
        error: (err) => {
          console.error('❌ Erreur lors du chargement de la photo:', err);
          this.error.set('Impossible de charger la photo justificative.');
        },
      });
  }

  // ──────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────
  // Dans le composant, ajouter une méthode
  getServicePhotoUrl(photoId: string): string {
    if (!photoId) return '';
    return `${environment.apiUrl}/api/v1/Service/photos/${photoId}`;
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
