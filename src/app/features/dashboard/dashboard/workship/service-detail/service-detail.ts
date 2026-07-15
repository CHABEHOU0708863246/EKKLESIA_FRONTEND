// src/app/features/dashboard/services/service-detail/service-detail.component.ts

import { Component, OnDestroy, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ServiceUtils } from '../../../../../core/models/Events/service.model';
import { Users } from '../../../../../core/services/Users/users';
import { Service } from '../../../../../core/services/Worship/service';



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
  private serviceService = inject(Service);
  public userService = inject(Users);

  service = signal<any | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  deleting = signal(false);

  // Helpers
  getStatusLabel = ServiceUtils.getStatusLabel;
  getStatusColor = ServiceUtils.getStatusColor;
  getFormattedDate = ServiceUtils.getFormattedDate;
  getTotalAttendance = ServiceUtils.getTotalAttendance;

  // ── États pour les onglets (si vous en voulez) ──
  activeTab = signal<'details' | 'team' | 'attendance'>('details');
Math = Math;

  constructor() {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Identifiant du culte manquant.');
      this.loading.set(false);
      return;
    }
    this.loadService(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
          // Gérer les deux structures possibles
          let data = null;
          if (response && typeof response === 'object') {
            if (response.success && response.data) {
              data = response.data;
            } else if (response.id) {
              data = response;
            }
          }

          if (data) {
            this.service.set(data);
          } else {
            this.error.set('Impossible de charger ce culte.');
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error('❌ Erreur chargement détail:', err);
          this.error.set('Erreur lors du chargement du culte.');
          this.loading.set(false);
        },
      });
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
      this.router.navigate(['/dashboard/cultes', s.id, 'checkin']);
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
  // MÉTHODES DE VÉRIFICATION POUR LE TEMPLATE
  // ──────────────────────────────────────────────────────────────

  hasAnyTeamMember(service: any): boolean {
    if (!service || !service.team) return false;
    return Object.values(service.team).some((arr: any) => arr && arr.length > 0);
  }

  getTeamKeys(service: any): string[] {
    if (!service || !service.team) return [];
    return Object.keys(service.team);
  }

  getTeamLabel(key: string): string {
    const labels: Record<string, string> = {
      worship: 'Louange',
      sound: 'Sonorisation',
      lighting: 'Lumière',
      welcome: 'Accueil',
      ushers: 'Huissiers',
      children: 'Enfants',
      media: 'Médias',
      other: 'Autre',
    };
    return labels[key] || key;
  }

  getTotalConfirmed(service: any): number {
    if (!service || !service.team) return 0;
    let count = 0;
    Object.values(service.team).forEach((members: any) => {
      if (Array.isArray(members)) {
        count += members.filter((m: any) => m.confirmed).length;
      }
    });
    return count;
  }

  getTotalTeamMembers(service: any): number {
    if (!service || !service.team) return 0;
    let count = 0;
    Object.values(service.team).forEach((members: any) => {
      if (Array.isArray(members)) {
        count += members.length;
      }
    });
    return count;
  }

  getMemberPhotoUrl(member: any): string {
    return this.userService.getPhotoUrl(member.photoUrl);
  }

  getMemberFullName(member: any): string {
    return `${member.firstName || ''} ${member.lastName || ''}`.trim();
  }

  getMemberInitials(member: any): string {
    const first = member.firstName?.charAt(0) || '?';
    const last = member.lastName?.charAt(0) || '?';
    return `${first}${last}`.toUpperCase();
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
