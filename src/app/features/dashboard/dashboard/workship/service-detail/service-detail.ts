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


@Component({
  selector: 'app-service-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
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
  photoObjectUrl = signal<string | null>(null);
  preacherPhotoObjectUrl = signal<string | null>(null);
photoLoadFailed = signal(false);

  service = signal<any | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  deleting = signal(false);

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


private loadServicePhoto(photoId: string): void {
  if (!photoId) return;
  this.photoLoadFailed.set(false);
  this.serviceService.getPhoto(photoId)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (blob) => this.photoObjectUrl.set(URL.createObjectURL(blob)),
      error: (err) => {
        console.error('❌ Erreur chargement photo culte:', err);
        this.photoLoadFailed.set(true);
      },
    });
}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.photoObjectUrl()) URL.revokeObjectURL(this.photoObjectUrl()!);
    if (this.preacherPhotoObjectUrl()) URL.revokeObjectURL(this.preacherPhotoObjectUrl()!);
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
            // Appeler les services pour obtenir les noms
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
            // Ensuite charger le site si besoin
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
            if (service.attendance?.photoUrl) {
              this.loadServicePhoto(service.attendance.photoUrl);
            }
            this.service.set(service);
            this.loading.set(false);
          },
          error: () => {
            this.service.set(service);
            this.loading.set(false);
          },
        });
    } else {
      this.service.set(service);
      this.loading.set(false);
    }
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
