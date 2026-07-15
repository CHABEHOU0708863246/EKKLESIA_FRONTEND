// src/app/features/dashboard/dashboard/events/event-list/event-list.ts

import { Component, OnInit, signal, computed, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

import { Event, EventFilter, EventStatus, EventType, DEFAULT_EVENT_FILTER } from '../../../../../core/models/Events/event.model';
import { EventStatusLabels, EventTypeLabels, EventUtils } from '../../../../../core/models/Events/event.model';
import { Events } from '../../../../../core/services/Event/events';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './event-list.html',
  styleUrls: ['./event-list.scss'],
})
export class EventList implements OnInit {
  private destroyRef = inject(DestroyRef);
  private eventService = inject(Events);

  // ── État ──
  events = signal<Event[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // ── Pagination ──
  totalCount = 0;
  totalPages = 1;
  currentPage = 1;

  // ── Filtres ──
  filter: EventFilter = { ...DEFAULT_EVENT_FILTER };

  // ── Options pour les filtres ──
  readonly typeOptions = Object.values(EventType).map((value) => ({
    value,
    label: EventTypeLabels[value],
  }));
  readonly statusOptions = Object.values(EventStatus).map((value) => ({
    value,
    label: EventStatusLabels[value],
  }));

  // ── Contrôle de recherche avec debounce ──
  private searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.filter.title = term || undefined;
        this.filter.page = 1;
        this.loadEvents();
      });
  }

  ngOnInit(): void {
    this.loadEvents();
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT
  // ───────────────────────────────────────────────────────────────

loadEvents(): void {
  this.loading.set(true);
  this.error.set(null);

  this.eventService
    .getAll(this.filter)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (response) => {
        // ✅ Plus de wrapper : response est directement EventListResponse
        this.events.set(response.items);
        this.totalCount = response.totalCount;
        this.totalPages = response.totalPages;
        this.currentPage = response.currentPage;
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Erreur lors du chargement des événements:', err);
        this.error.set('Une erreur est survenue lors du chargement.');
        this.loading.set(false);
      },
    });
}

  // ───────────────────────────────────────────────────────────────
  // FILTRES & RECHERCHE
  // ───────────────────────────────────────────────────────────────

  onSearch(term: string): void {
    this.searchSubject.next(term);
  }

  onFilterChange(): void {
    this.filter.page = 1;
    this.loadEvents();
  }

  resetFilters(): void {
    this.filter = { ...DEFAULT_EVENT_FILTER };
    this.loadEvents();
  }

  // ───────────────────────────────────────────────────────────────
  // PAGINATION
  // ───────────────────────────────────────────────────────────────

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.filter.page = page;
    this.loadEvents();
  }

  previousPage(): void {
    if (this.currentPage > 1) this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.goToPage(this.currentPage + 1);
  }

  // ───────────────────────────────────────────────────────────────
  // ACTIONS
  // ───────────────────────────────────────────────────────────────

deleteEvent(id: string, eventTitle: string): void {
  if (confirm(`Êtes-vous sûr de vouloir supprimer l'événement « ${eventTitle} » ?`)) {
    this.eventService.delete(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { // ✅ Suppression du wrapper, le retour est direct
        this.loadEvents();
      },
      error: (err) => {
        console.error('❌ Erreur lors de la suppression:', err);
        this.error.set('Une erreur est survenue lors de la suppression.');
      },
    });
  }
}

cancelEvent(id: string, eventTitle: string): void {
  if (confirm(`Confirmer l'annulation de l'événement « ${eventTitle} » ?`)) {
    this.eventService.cancel(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => { // ✅ Retourne ApiResponse<Event> ici
        if (response.success) {
          this.loadEvents();
        } else {
          this.error.set(response.message || 'Erreur lors de l\'annulation.');
        }
      },
      error: (err) => {
        console.error('❌ Erreur lors de l\'annulation:', err);
        this.error.set('Une erreur est survenue lors de l\'annulation.');
      },
    });
  }
}

  // ───────────────────────────────────────────────────────────────
  // HELPERS
  // ───────────────────────────────────────────────────────────────

  getStatusLabel(status: EventStatus): string {
    return EventUtils.getStatusLabel(status);
  }

  getStatusColor(status: EventStatus): string {
    return EventUtils.getStatusColor(status);
  }

  getTypeLabel(type: EventType): string {
    return EventUtils.getTypeLabel(type);
  }

  getTypeColor(type: EventType): string {
    return EventUtils.getTypeColor(type);
  }

  formatDate(date: string): string {
    return EventUtils.getFormattedDate(date);
  }

  formatDateTime(date: string): string {
    return EventUtils.getFormattedDateTime(date);
  }

  getStatusClass(status: EventStatus): string {
    const color = this.getStatusColor(status);
    return `ev-status-badge ev-status-badge--${color}`;
  }

  getTypeClass(type: EventType): string {
    const color = this.getTypeColor(type);
    return `ev-type-badge ev-type-badge--${color}`;
  }

  isCancellable(event: Event): boolean {
    return event.status !== EventStatus.Cancelled && event.status !== EventStatus.Completed;
  }

  isDeletable(event: Event): boolean {
    return event.status === EventStatus.Cancelled || event.status === EventStatus.Completed;
  }
}
