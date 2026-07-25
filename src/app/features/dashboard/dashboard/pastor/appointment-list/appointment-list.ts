// src/app/features/dashboard/pastor/appointments/appointment-list/appointment-list.component.ts

import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import {
  Appointment,
  AppointmentStatus,
  AppointmentUtils,
  AppointmentFilter,
} from '../../../../../core/models/Pastor/appointment.model';
import { Permissions } from '../../../../../core/services/Permissions/permissions';
import { PastorAppointmentService } from '../../../../../core/services/PastortRvd/pastort-appointment';

@Component({
  selector: 'app-appointment-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './appointment-list.html',
  styleUrls: ['./appointment-list.scss'],
})
export class AppointmentList implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private service = inject(PastorAppointmentService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  public permissions = inject(Permissions);

  // ── États du service ──
  readonly appointments = this.service.appointments;
  readonly loading = this.service.loading;
  readonly error = this.service.error;
  readonly totalCount = this.service.totalCount;
  readonly currentPage = this.service.currentPage;
  readonly totalPages = this.service.totalPages;
  readonly pageSize = this.service.pageSize;
  readonly upcomingAppointments = this.service.upcomingAppointments;

  stats = computed(() => {
    const list = this.appointments();
    console.log('📊 [AppointmentList] Recalcul des stats, liste actuelle:', list);
    return AppointmentUtils.getAppointmentStats(list);
  });

  filterForm: FormGroup;
  readonly statusOptions = Object.values(AppointmentStatus).map((s) => ({
    value: s,
    label: AppointmentUtils.getStatusLabel(s),
  }));

  deletingId = signal<string | null>(null);
  showDeleteModal = signal(false);
  appointmentToDelete = signal<Appointment | null>(null);
  readonly Math = Math;

  readonly pageSizeOptions = [10, 20, 50, 100];
  currentPageSize = signal(20);

  constructor() {
    this.filterForm = this.fb.group({
      search: [''],
      status: [''],
      dateFrom: [''],
      dateTo: [''],
    });
  }

  ngOnInit(): void {
    console.log('🚀 [AppointmentList] ngOnInit — chargement initial');
    this.loadAppointments();

    this.filterForm.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((values) => {
        console.log('🔍 [AppointmentList] Filtres modifiés:', values);
        this.service.setPage(1);
        this.loadAppointments();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Chargement ──
  loadAppointments(): void {
    const raw = this.filterForm.value;
    const filter: Partial<AppointmentFilter> = {
      page: this.currentPage(),
      pageSize: this.currentPageSize(),
      dateFrom: raw.dateFrom || undefined,
      dateTo: raw.dateTo || undefined,
      status: raw.status || undefined,
      reason: raw.search || undefined,
    };

    console.log('📡 [AppointmentList] Appel getAppointments avec filtre:', filter);

    this.service.getAppointments(filter).subscribe({
      next: (result) => {
        console.log('✅ [AppointmentList] Rendez-vous reçus:', result);
        console.log('✅ [AppointmentList] Nombre d\'items:', result.items?.length);
      },
      error: (err) => {
        console.error('❌ [AppointmentList] Erreur lors du chargement:', err);
      },
    });
  }

  // ── Pagination ──
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.service.setPage(page);
    this.loadAppointments();
  }

  previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  onPageSizeChange(size: number): void {
    this.currentPageSize.set(size);
    this.service.setPage(1);
    this.loadAppointments();
  }

  // ── Actions ──
  viewAppointment(id: string): void {
    this.router.navigate(['/dashboard/rendez-vous', id]);
  }

  editAppointment(id: string, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/dashboard/rendez-vous', id, 'edit']);
  }

  // ── Gestion du statut ──
  confirmAppointment(id: string, event: Event): void {
    event.stopPropagation();
    if (confirm('Confirmer ce rendez-vous ?')) {
      this.service.updateStatus(id, AppointmentStatus.Confirmed).subscribe({
        next: () => console.log('✅ Statut confirmé pour', id),
        error: (err) => console.error('❌ Erreur confirmation:', err),
      });
    }
  }

  completeAppointment(id: string, event: Event): void {
    event.stopPropagation();
    if (confirm('Marquer ce rendez-vous comme terminé ?')) {
      this.service.updateStatus(id, AppointmentStatus.Completed).subscribe({
        next: () => console.log('✅ Statut terminé pour', id),
        error: (err) => console.error('❌ Erreur completion:', err),
      });
    }
  }

  cancelAppointment(id: string, event: Event): void {
    event.stopPropagation();
    const reason = prompt('Raison de l’annulation (facultatif) :');
    if (reason !== null) {
      this.service.updateStatus(id, AppointmentStatus.Cancelled).subscribe({
        next: () => console.log('✅ Statut annulé pour', id),
        error: (err) => console.error('❌ Erreur annulation:', err),
      });
    }
  }

  // ── Suppression ──
  openDeleteModal(appointment: Appointment, event: Event): void {
    event.stopPropagation();
    this.appointmentToDelete.set(appointment);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.appointmentToDelete.set(null);
  }

  confirmDelete(): void {
    const app = this.appointmentToDelete();
    if (!app) return;
    this.deletingId.set(app.id);
    this.service.deleteAppointment(app.id).subscribe({
      next: () => {
        console.log('✅ Rendez-vous supprimé:', app.id);
        this.deletingId.set(null);
        this.closeDeleteModal();
      },
      error: (err) => {
        console.error('❌ Erreur suppression:', err);
        this.deletingId.set(null);
      },
    });
  }

  // ── Helpers ──
  getStatusClass(status: AppointmentStatus): string {
    const color = AppointmentUtils.getStatusColor(status);
    return `badge-${color}`;
  }

  getStatusLabel(status: AppointmentStatus): string {
    return AppointmentUtils.getStatusLabel(status);
  }

  getFormattedDate(date: string): string {
    return AppointmentUtils.getFormattedDate(date);
  }

  getParticipantName(appointment: Appointment): string {
    return appointment.memberName ?? appointment.visitorName ?? '—';
  }

  isUpcoming(appointment: Appointment): boolean {
    return AppointmentUtils.isUpcoming(appointment);
  }

  isPast(appointment: Appointment): boolean {
    return AppointmentUtils.isPast(appointment);
  }

  isToday(appointment: Appointment): boolean {
    return AppointmentUtils.isToday(appointment);
  }

  canEdit(appointment: Appointment): boolean {
    return appointment.status !== AppointmentStatus.Completed &&
           appointment.status !== AppointmentStatus.Cancelled;
  }

  canConfirm(appointment: Appointment): boolean {
    return appointment.status === AppointmentStatus.Scheduled ||
           appointment.status === AppointmentStatus.Rescheduled;
  }

  canComplete(appointment: Appointment): boolean {
    return appointment.status === AppointmentStatus.Confirmed ||
           appointment.status === AppointmentStatus.Scheduled;
  }

  canCancel(appointment: Appointment): boolean {
    return appointment.status !== AppointmentStatus.Completed &&
           appointment.status !== AppointmentStatus.Cancelled;
  }

  canDelete(appointment: Appointment): boolean {
    return appointment.status !== AppointmentStatus.Completed;
  }

  refresh(): void {
    console.log('🔄 [AppointmentList] Rafraîchissement manuel');
    this.loadAppointments();
  }

  resetFilters(): void {
    this.filterForm.reset({
      search: '',
      status: '',
      dateFrom: '',
      dateTo: '',
    });
    this.service.setPage(1);
    this.loadAppointments();
  }

  get AppointmentStatus() {
    return AppointmentStatus;
  }
}
