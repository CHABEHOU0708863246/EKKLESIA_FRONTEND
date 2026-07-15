// src/app/features/dashboard/services/service-list/service-list.component.ts

import { Component, OnDestroy, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ServiceStatus, ServiceStatusLabels, ServiceUtils, ServiceStatusColors, ServiceFilter, DEFAULT_SERVICE_FILTER } from '../../../../../core/models/Events/service.model';
import { User } from '../../../../../core/models/Users/user.model';
import { Users } from '../../../../../core/services/Users/users';
import { Service } from '../../../../../core/services/Worship/service';


const STATUS_OPTIONS = Object.values(ServiceStatus).map((value) => ({
  value,
  label: ServiceStatusLabels[value],
}));

@Component({
  selector: 'app-service-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './service-list.html',
  styleUrls: ['./service-list.scss'],
})
export class ServiceList implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Services
  private serviceService = inject(Service);
  public userService = inject(Users);
  private router = inject(Router);

  // ── État ──
  services = signal<any[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  totalCount = signal(0);
  currentPage = signal(1);
  pageSize = signal(20);
  totalPages = signal(1);

  // ── Filtres ──
  searchControl = new FormControl('');
  statusControl = new FormControl('');
  preacherControl = new FormControl('');

  // ── Liste des prédicateurs (pour le filtre) ──
  preachers = signal<User[]>([]);
  loadingPreachers = signal(false);

  // ── Statistiques ──
  stats = computed(() => {
    const services = this.services();
    if (!services.length) return null;
    return ServiceUtils.getServiceStats(services);
  });

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

  // ── Statuts ──
  readonly statusOptions = STATUS_OPTIONS;
  readonly ServiceStatus = ServiceStatus;
  readonly ServiceStatusLabels = ServiceStatusLabels;
  readonly ServiceStatusColors = ServiceStatusColors;

  // ── Suppression ──
  deleteDialogVisible = signal(false);
  serviceToDelete = signal<any | null>(null);
  deleting = signal(false);

  // ── Méthodes d'affichage ──
  getStatusLabel = ServiceUtils.getStatusLabel;
  getStatusColor = ServiceUtils.getStatusColor;
  getFormattedDate = ServiceUtils.getFormattedDate;
  getTotalAttendance = ServiceUtils.getTotalAttendance;

  constructor() {}

  ngOnInit(): void {
    this.loadPreachers();
    this.loadServices();

    // Recherche textuelle
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadServices();
      });

    // Filtre statut
    this.statusControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadServices();
      });

    // Filtre prédicateur
    this.preacherControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadServices();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT DES DONNÉES
  // ──────────────────────────────────────────────────────────────

  private loadPreachers(): void {
    this.loadingPreachers.set(true);
    this.userService
      .getUsers({ page: 1, pageSize: 100, roles: ['PASTEUR_SITE', 'PASTOR_PRINCIPAL'] } as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const items = (response.data as any).items ?? response.data ?? [];
            this.preachers.set(items);
          } else {
            this.preachers.set([]);
          }
          this.loadingPreachers.set(false);
        },
        error: () => {
          this.preachers.set([]);
          this.loadingPreachers.set(false);
        },
      });
  }

  private loadServices(): void {
  this.loading.set(true);
  this.error.set(null);

  const filter: ServiceFilter = {
    ...DEFAULT_SERVICE_FILTER,
    page: this.currentPage(),
    pageSize: this.pageSize(),
    title: this.searchControl.value || undefined,
    status: this.statusControl.value as ServiceStatus || undefined,
    preacherId: this.preacherControl.value || undefined,
  };

  this.serviceService
    .getAll(filter)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: any) => {
        // ✅ Détection automatique de la structure
        let data: any;
        let success = true;
        let message = '';

        if (response && typeof response === 'object') {
          // Cas 1 : wrapper ApiResponse
          if ('success' in response && 'data' in response) {
            success = response.success;
            message = response.message || '';
            data = response.data;
          }
          // Cas 2 : réponse directe (items, totalCount, ...)
          else if ('items' in response && 'totalCount' in response) {
            data = response;
          }
          // Cas 3 : autre structure inconnue
          else {
            data = null;
            success = false;
            message = 'Structure de réponse inconnue.';
          }
        }

        if (success && data && data.items) {
          this.services.set(data.items);
          this.totalCount.set(data.totalCount || 0);
          this.currentPage.set(data.currentPage || 1);
          this.totalPages.set(data.totalPages || 1);
          this.error.set(null);
        } else {
          this.services.set([]);
          this.totalCount.set(0);
          this.error.set(message || 'Impossible de charger les cultes.');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Erreur chargement cultes:', err);
        this.services.set([]);
        this.loading.set(false);
        this.error.set('Erreur lors du chargement des cultes.');
      },
    });
}

  refresh(): void {
    this.loadServices();
  }

  resetFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.statusControl.setValue('', { emitEvent: false });
    this.preacherControl.setValue('', { emitEvent: false });
    this.currentPage.set(1);
    this.loadServices();
  }

  // ──────────────────────────────────────────────────────────────
  // PAGINATION
  // ──────────────────────────────────────────────────────────────

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadServices();
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
    this.loadServices();
  }

  get pageSizeOptions(): number[] {
    return [10, 20, 50, 100];
  }

  // ──────────────────────────────────────────────────────────────
  // ACTIONS
  // ──────────────────────────────────────────────────────────────

  viewService(service: any): void {
    this.router.navigate(['/dashboard/cultes', service.id]);
  }

  editService(service: any, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/dashboard/cultes', service.id, 'edit']);
  }

  manageAttendance(service: any, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/dashboard/cultes', service.id, 'checkin']);
  }

  requestDelete(service: any, event: Event): void {
    event.stopPropagation();
    this.serviceToDelete.set(service);
    this.deleteDialogVisible.set(true);
  }

  confirmDelete(): void {
    const service = this.serviceToDelete();
    if (!service) return;

    this.deleting.set(true);
    this.serviceService
      .delete(service.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.serviceToDelete.set(null);
          if (response.success) {
            this.loadServices();
          } else {
            this.error.set(response.message || 'Impossible de supprimer ce culte.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur suppression:', err);
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.serviceToDelete.set(null);
          this.error.set('Impossible de supprimer ce culte.');
        },
      });
  }

  cancelDelete(): void {
    this.deleteDialogVisible.set(false);
    this.serviceToDelete.set(null);
  }

  // ──────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────

  getPreacherName(service: any): string {
    return service.preacherName || '—';
  }

  getUserFullName(user: User): string {
    return user.fullName || `${user.firstName} ${user.lastName}`.trim();
  }

  getUserPhotoUrl(user: User): string {
    return this.userService.getPhotoUrl(user.photoUrl);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  // ──────────────────────────────────────────────────────────────
  // EXPORT
  // ──────────────────────────────────────────────────────────────

  exportServices(format: 'csv' | 'xlsx'): void {
    // Implémentation si besoin
    console.log('Export en', format, 'pas encore implémenté');
  }
}
