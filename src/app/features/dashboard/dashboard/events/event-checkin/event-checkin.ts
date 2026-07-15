// src/app/features/dashboard/dashboard/events/event-checkin/event-checkin.ts

import { Component, OnInit, signal, computed, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';

import { Event, EventStatus, EventAttendee } from '../../../../../core/models/Events/event.model';
import { EventUtils } from '../../../../../core/models/Events/event.model';
import { Events } from '../../../../../core/services/Event/events';

@Component({
  selector: 'app-event-checkin',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './event-checkin.html',
  styleUrls: ['./event-checkin.scss'],
})
export class EventCheckin implements OnInit {
  private destroyRef = inject(DestroyRef);
  private eventService = inject(Events);
  private route = inject(ActivatedRoute);
  public router = inject(Router);

  // ── État ──
  event = signal<Event | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  togglingId = signal<string | null>(null);

  // ── Filtres ──
  searchTerm = signal('');
  filterStatus = signal<'all' | 'checked' | 'unchecked'>('all');

  // ── Statistiques calculées ──
  attendees = computed(() => {
    const ev = this.event();
    if (!ev) return [];
    return ev.attendees || [];
  });

  filteredAttendees = computed(() => {
    const list = this.attendees();
    const search = this.searchTerm().toLowerCase().trim();
    const status = this.filterStatus();

    return list.filter((a) => {
      const fullName = `${a.firstName} ${a.lastName}`.toLowerCase();
      const matchesSearch = fullName.includes(search) || (a.email?.toLowerCase().includes(search) ?? false);
      if (!matchesSearch) return false;

      if (status === 'checked') return a.checkedIn;
      if (status === 'unchecked') return !a.checkedIn;
      return true;
    });
  });

  checkedCount = computed(() => this.attendees().filter((a) => a.checkedIn).length);
  uncheckedCount = computed(() => this.attendees().length - this.checkedCount());
  totalAttendees = computed(() => this.attendees().length);

  ngOnInit(): void {
    const eventId = this.route.snapshot.paramMap.get('id');
    if (!eventId) {
      this.error.set('Aucun événement spécifié.');
      this.loading.set(false);
      return;
    }
    this.loadEvent(eventId);
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT DE L'ÉVÉNEMENT
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
  // CHECK-IN / CHECK-OUT (utilise l'ID du participant)
  // ───────────────────────────────────────────────────────────────

  toggleCheckIn(attendee: EventAttendee): void {
    const ev = this.event();
    if (!ev) return;

    // 🔧 Utiliser l'identifiant du participant (id, memberId, email)
    const identifier = attendee.id || attendee.memberId || attendee.email || '';
    if (!identifier) {
      this.error.set('Ce participant ne peut pas être identifié (pas d\'ID, de memberId ni d\'email).');
      return;
    }

    const newCheckedIn = !attendee.checkedIn;
    this.togglingId.set(identifier);

    this.eventService
      .checkInAttendee({
        eventId: ev.id,
        attendeeId: identifier,
        checkedIn: newCheckedIn,
      })
      .pipe(
        finalize(() => this.togglingId.set(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.event.set(response.data);
          } else {
            this.error.set(response.message || 'Présence enregistré avec success.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur lors du check-in:', err);
          this.error.set('Une erreur est survenue lors du check-in.');
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // ACTIONS DE MASSE
  // ───────────────────────────────────────────────────────────────

  checkAll(): void {
    const ev = this.event();
    if (!ev) return;
    const unchecked = ev.attendees?.filter((a) => !a.checkedIn) || [];
    if (unchecked.length === 0) return;
    if (!confirm(`Marquer les ${unchecked.length} participants non-checkés comme présents ?`)) return;

    // On les check un par un
    unchecked.forEach((a) => this.toggleCheckIn(a));
  }

  uncheckAll(): void {
    const ev = this.event();
    if (!ev) return;
    const checked = ev.attendees?.filter((a) => a.checkedIn) || [];
    if (checked.length === 0) return;
    if (!confirm(`Annuler le check-in des ${checked.length} participants ?`)) return;

    checked.forEach((a) => this.toggleCheckIn(a));
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
    return `ec-status-badge ec-status-badge--${color}`;
  }

  getTypeLabel(type: string): string {
    return EventUtils.getTypeLabel(type as any);
  }

  getTypeColor(type: string): string {
    return EventUtils.getTypeColor(type as any);
  }

  getTypeClass(type: string): string {
    const color = this.getTypeColor(type);
    return `ec-type-badge ec-type-badge--${color}`;
  }

  formatDate(date: string): string {
    return EventUtils.getFormattedDate(date);
  }

  formatDateTime(date: string): string {
    return EventUtils.getFormattedDateTime(date);
  }

  getAttendeeFullName(attendee: EventAttendee): string {
    return `${attendee.firstName} ${attendee.lastName}`.trim();
  }

  isToggling(attendee: EventAttendee): boolean {
    const identifier = attendee.id || attendee.memberId || attendee.email || '';
    return this.togglingId() === identifier;
  }

  canCheckIn(): boolean {
    const ev = this.event();
    return !!ev && (ev.status === EventStatus.Scheduled || ev.status === EventStatus.Ongoing);
  }

  goBack(): void {
    const ev = this.event();
    if (ev) {
      this.router.navigate(['/dashboard/evenements', ev.id]);
    } else {
      this.router.navigate(['/dashboard/evenements']);
    }
  }
}
