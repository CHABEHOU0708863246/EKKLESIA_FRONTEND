import { Component, OnInit, signal, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';

import { Event, EventStatus, PaymentStatus, EventAttendeeRegister } from '../../../../../core/models/Events/event.model';
import { EventUtils } from '../../../../../core/models/Events/event.model';
import { Events } from '../../../../../core/services/Event/events';

@Component({
  selector: 'app-event-registrations',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './event-registrations.html',
  styleUrls: ['./event-registrations.scss'],
})
export class EventRegistrations implements OnInit {
  private destroyRef = inject(DestroyRef);
  private eventService = inject(Events);
  private route = inject(ActivatedRoute);
  public router = inject(Router);
  private fb = inject(FormBuilder);

  // État principal
  event = signal<Event | null>(null);
  events = signal<Event[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  showAddForm = signal(false);
  adding = signal(false);
  togglingCheckIn = signal<string | null>(null);
  deleting = signal<string | null>(null);

  registerForm: FormGroup;

  paymentStatusOptions = Object.values(PaymentStatus).map((value) => ({
    value,
    label: EventUtils.getPaymentStatusLabel(value),
  }));

  constructor() {
    this.registerForm = this.fb.group({
      memberId: [''],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.email]],
      phone: [''],
      paymentStatus: [PaymentStatus.Pending],
      notes: [''],
    });
  }

  ngOnInit(): void {
    const eventId = this.route.snapshot.queryParamMap.get('eventId');
    if (eventId) {
      this.loadEvent(eventId);
    } else {
      // Aucun événement sélectionné → afficher la liste
      this.loadEventsList();
    }
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT DE LA LISTE DES ÉVÉNEMENTS
  // ───────────────────────────────────────────────────────────────

  private loadEventsList(): void {
    this.loading.set(true);
    this.error.set(null);

    this.eventService
      .getAll({ page: 1, pageSize: 50, sortBy: 'startDate', sortOrder: 'asc' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response && response.items) {
            this.events.set(response.items);
            this.loading.set(false);
          } else {
            this.error.set('Impossible de charger la liste des événements.');
            this.loading.set(false);
          }
        },
        error: (err) => {
          console.error('❌ Erreur lors du chargement des événements:', err);
          this.error.set('Une erreur est survenue.');
          this.loading.set(false);
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT D'UN ÉVÉNEMENT SPÉCIFIQUE
  // ───────────────────────────────────────────────────────────────

  private loadEvent(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.eventService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          let ev: Event | null = null;
          if (response && response.id) {
            ev = response;
          } else if (response && response.success && response.data) {
            ev = response.data;
          } else {
            this.error.set('Format de réponse inattendu.');
            this.loading.set(false);
            return;
          }

          if (ev) {
            this.event.set(ev);
            this.loading.set(false);
          } else {
            this.error.set('Aucune donnée d’événement trouvée.');
            this.loading.set(false);
          }
        },
        error: (err) => {
          console.error('❌ Erreur lors du chargement de l’événement:', err);
          this.error.set(err.message || 'Une erreur est survenue.');
          this.loading.set(false);
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // SÉLECTION D'UN ÉVÉNEMENT DEPUIS LA LISTE
  // ───────────────────────────────────────────────────────────────

  selectEvent(event: Event): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { eventId: event.id },
      queryParamsHandling: 'merge',
    });
    this.loadEvent(event.id);
  }

  // ───────────────────────────────────────────────────────────────
  // AFFICHAGE DU FORMULAIRE D'AJOUT
  // ───────────────────────────────────────────────────────────────

  toggleAddForm(): void {
    if (this.showAddForm()) {
      this.registerForm.reset({
        memberId: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        paymentStatus: PaymentStatus.Pending,
        notes: '',
      });
    }
    this.showAddForm.update((v) => !v);
  }

  // ───────────────────────────────────────────────────────────────
  // INSCRIPTION D'UN PARTICIPANT
  // ───────────────────────────────────────────────────────────────

  registerAttendee(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const ev = this.event();
    if (!ev) return;

    const value = this.registerForm.value;
    const payload: EventAttendeeRegister = {
      eventId: ev.id,
      memberId: value.memberId || undefined,
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      email: value.email || undefined,
      phone: value.phone || undefined,
      paymentStatus: value.paymentStatus,
      notes: value.notes || undefined,
    };

    this.adding.set(true);
    this.eventService
      .registerAttendee(ev.id, payload)
      .pipe(
        finalize(() => {
          this.adding.set(false);
          this.showAddForm.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            if (response.data) {
              this.event.set(response.data);
            } else {
              this.loadEvent(ev.id);
            }
            this.registerForm.reset({
              memberId: '',
              firstName: '',
              lastName: '',
              email: '',
              phone: '',
              paymentStatus: PaymentStatus.Pending,
              notes: '',
            });
            Object.keys(this.registerForm.controls).forEach((key) => {
              this.registerForm.get(key)?.markAsPristine();
            });
            // Pas d'erreur, on la vide
            this.error.set(null);
            // Vous pouvez ajouter un message de succès (toast) ici
          } else {
            this.error.set(response.message || 'Erreur lors de l’inscription.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur lors de l’inscription:', err);
          this.error.set('Une erreur est survenue lors de l’inscription.');
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // CHECK-IN D'UN PARTICIPANT
  // ───────────────────────────────────────────────────────────────

  toggleCheckIn(attendee: any): void {
    const ev = this.event();
    if (!ev) return;

    const newCheckedIn = !attendee.checkedIn;
    const identifier = attendee.memberId || attendee.email || `${attendee.firstName}${attendee.lastName}`;
    this.togglingCheckIn.set(identifier);

    this.eventService
      .checkInAttendee({
        eventId: ev.id,
        attendeeId: attendee.memberId || attendee.email || '',
        checkedIn: newCheckedIn,
      })
      .pipe(
        finalize(() => this.togglingCheckIn.set(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.event.set(response.data);
          } else {
            this.error.set(response.message || 'Erreur lors du check-in.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur lors du check-in:', err);
          this.error.set('Une erreur est survenue lors du check-in.');
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // DÉSINSCRIPTION D'UN PARTICIPANT
  // ───────────────────────────────────────────────────────────────

  unregisterAttendee(attendee: any): void {
    const ev = this.event();
    if (!ev) return;

    const identifier = attendee.memberId || attendee.email || '';
    if (!identifier) return;

    if (!confirm(`Retirer ${attendee.firstName} ${attendee.lastName} de l’événement ?`)) return;

    this.deleting.set(identifier);
    this.eventService
      .unregisterAttendee(ev.id, identifier)
      .pipe(
        finalize(() => this.deleting.set(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (success) => {
          if (success) {
            this.loadEvent(ev.id);
          } else {
            this.error.set('Erreur lors de la désinscription.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur lors de la désinscription:', err);
          this.error.set('Une erreur est survenue lors de la désinscription.');
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // MÉTHODES UTILITAIRES POUR LE TEMPLATE
  // ───────────────────────────────────────────────────────────────

  canRegister(): boolean {
    const ev = this.event();
    return !!ev && ev.registrationOpen && ev.status !== EventStatus.Cancelled && ev.status !== EventStatus.Completed;
  }

  canUnregister(): boolean {
    const ev = this.event();
    return !!ev && ev.status !== EventStatus.Cancelled && ev.status !== EventStatus.Completed;
  }

  isFull(): boolean {
    const ev = this.event();
    return !!ev && ev.capacity !== undefined && ev.capacity > 0 && (ev.attendees?.length || 0) >= ev.capacity;
  }

  get availableSpots(): number {
    const ev = this.event();
    if (!ev) return 0;
    if (ev.capacity) return Math.max(0, ev.capacity - (ev.attendees?.length || 0));
    return Infinity;
  }

  goBack(): void {
    const ev = this.event();
    if (ev) {
      this.router.navigate(['/dashboard/evenements', ev.id]);
    } else {
      this.router.navigate(['/dashboard/evenements']);
    }
  }

  // ───────────────────────────────────────────────────────────────
  // HELPERS D'AFFICHAGE
  // ───────────────────────────────────────────────────────────────

  getStatusLabel(status: EventStatus): string {
    return EventUtils.getStatusLabel(status);
  }

  getStatusColor(status: EventStatus): string {
    return EventUtils.getStatusColor(status);
  }

  getStatusClass(status: EventStatus): string {
    const color = this.getStatusColor(status);
    return `er-status-badge er-status-badge--${color}`;
  }

  getTypeLabel(type: string): string {
    return EventUtils.getTypeLabel(type as any);
  }

  getTypeColor(type: string): string {
    return EventUtils.getTypeColor(type as any);
  }

  getTypeClass(type: string): string {
    const color = this.getTypeColor(type);
    return `er-type-badge er-type-badge--${color}`;
  }

  formatDate(date: string): string {
    return EventUtils.getFormattedDate(date);
  }

  formatDateTime(date: string): string {
    return EventUtils.getFormattedDateTime(date);
  }

  getAttendeeFullName(attendee: any): string {
    return EventUtils.getAttendeeFullName(attendee);
  }

  getPaymentStatusLabel(status: any): string {
    return EventUtils.getPaymentStatusLabel(status);
  }

  getPaymentStatusColor(status: any): string {
    return EventUtils.getPaymentStatusColor(status);
  }

  getPaymentStatusClass(status: any): string {
    const color = this.getPaymentStatusColor(status);
    return `er-payment-status er-payment-status--${color}`;
  }

  isFieldInvalid(field: string): boolean {
    const control = this.registerForm.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}
