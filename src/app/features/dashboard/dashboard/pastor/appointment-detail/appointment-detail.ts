// src/app/features/dashboard/pastor/appointments/appointment-detail/appointment-detail.component.ts

import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Appointment, AppointmentStatus, AppointmentUtils } from '../../../../../core/models/Pastor/appointment.model';
import { PastorAppointmentService } from '../../../../../core/services/PastortRvd/pastort-appointment';
import { Permissions } from '../../../../../core/services/Permissions/permissions';

@Component({
  selector: 'app-appointment-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './appointment-detail.html',
  styleUrls: ['./appointment-detail.scss'],
})
export class AppointmentDetail implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(PastorAppointmentService);
  public permissions = inject(Permissions);

  // ── États ──
  appointment = signal<Appointment | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  deleting = signal(false);
  updatingStatus = signal(false);

  // ── Helpers ──
  readonly AppointmentStatus = AppointmentStatus;

  getStatusLabel = AppointmentUtils.getStatusLabel;
  getStatusColor = AppointmentUtils.getStatusColor;
  getFormattedDate = AppointmentUtils.getFormattedDate;
  getFormattedDuration = AppointmentUtils.getFormattedDuration;
  getParticipantName = AppointmentUtils.getParticipantName;

  // ── Calculs pour les actions ──
  canEdit = (): boolean => {
    const a = this.appointment();
    if (!a) return false;
    return a.status !== AppointmentStatus.Completed && a.status !== AppointmentStatus.Cancelled;
  };

  canConfirm = (): boolean => {
    const a = this.appointment();
    if (!a) return false;
    return a.status === AppointmentStatus.Scheduled || a.status === AppointmentStatus.Rescheduled;
  };

  canComplete = (): boolean => {
    const a = this.appointment();
    if (!a) return false;
    return a.status === AppointmentStatus.Confirmed || a.status === AppointmentStatus.Scheduled;
  };

  canCancel = (): boolean => {
    const a = this.appointment();
    if (!a) return false;
    return a.status !== AppointmentStatus.Completed && a.status !== AppointmentStatus.Cancelled;
  };

  canDelete = (): boolean => {
    const a = this.appointment();
    if (!a) return false;
    return a.status !== AppointmentStatus.Completed;
  };

  // ── Lifecycle ──
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Identifiant du rendez-vous manquant.');
      this.loading.set(false);
      return;
    }
    this.loadAppointment(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Chargement ──
  private loadAppointment(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.service.getAppointmentById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.appointment.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('❌ Erreur chargement:', err);
          this.error.set(err?.error?.message || 'Impossible de charger ce rendez-vous.');
          this.loading.set(false);
        },
      });
  }

  // ── Actions ──
  goBack(): void {
    this.router.navigate(['/dashboard/rendez-vous']);
  }

  editAppointment(): void {
    const a = this.appointment();
    if (a) {
      this.router.navigate(['/dashboard/rendez-vous', a.id, 'edit']);
    }
  }

  confirmAppointment(): void {
    const a = this.appointment();
    if (!a) return;
    if (confirm('Confirmer ce rendez-vous ?')) {
      this.updateStatus(a.id, AppointmentStatus.Confirmed);
    }
  }

  completeAppointment(): void {
    const a = this.appointment();
    if (!a) return;
    if (confirm('Marquer ce rendez-vous comme terminé ?')) {
      this.updateStatus(a.id, AppointmentStatus.Completed);
    }
  }

  cancelAppointment(): void {
    const a = this.appointment();
    if (!a) return;
    const reason = prompt('Raison de l’annulation (facultatif) :');
    if (reason !== null) {
      this.updateStatus(a.id, AppointmentStatus.Cancelled);
    }
  }

  private updateStatus(id: string, status: AppointmentStatus): void {
    this.updatingStatus.set(true);
    this.service.updateStatus(id, status)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.appointment.set(updated);
          this.updatingStatus.set(false);
        },
        error: (err) => {
          console.error('❌ Erreur mise à jour statut:', err);
          this.error.set(err?.error?.message || 'Erreur lors du changement de statut.');
          this.updatingStatus.set(false);
        },
      });
  }

  deleteAppointment(): void {
    const a = this.appointment();
    if (!a) return;
    if (confirm(`Supprimer définitivement ce rendez-vous avec ${this.getParticipantName(a)} ?`)) {
      this.deleting.set(true);
      this.service.deleteAppointment(a.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.deleting.set(false);
            this.router.navigate(['/dashboard/rendez-vous']);
          },
          error: (err) => {
            console.error('❌ Erreur suppression:', err);
            this.error.set(err?.error?.message || 'Impossible de supprimer ce rendez-vous.');
            this.deleting.set(false);
          },
        });
    }
  }

  // ── Helpers supplémentaires ──
  getParticipantPhone(appointment: Appointment): string {
    return appointment.visitorPhone ?? '—';
  }

  getParticipantEmail(appointment: Appointment): string {
    return appointment.visitorEmail ?? '—';
  }

  getStatusClass(status: AppointmentStatus): string {
    const color = AppointmentUtils.getStatusColor(status);
    return `badge-${color}`;
  }
}
