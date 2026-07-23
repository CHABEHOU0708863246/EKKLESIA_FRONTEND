// src/app/features/dashboard/dashboard/events/event-detail/event-detail.ts

import { Component, OnInit, signal, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Event, EventStatus, EventFormula } from '../../../../../core/models/Events/event.model';
import { EventUtils } from '../../../../../core/models/Events/event.model';
import { Events } from '../../../../../core/services/Event/events';
import { Church } from '../../../../../core/services/Church/church';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink],
  templateUrl: './event-detail.html',
  styleUrls: ['./event-detail.scss'],
})
export class EventDetail implements OnInit {
  private destroyRef = inject(DestroyRef);
  private eventService = inject(Events);
  private route = inject(ActivatedRoute);
  public router = inject(Router);
  private churchService = inject(Church);

  event = signal<Event | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  deleting = signal(false);
  cancelling = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Identifiant d’événement manquant.');
      return;
    }
    this.loadEvent(id);
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT
  // ───────────────────────────────────────────────────────────────

  loadEvent(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.eventService.getById(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response: any) => {
        let ev: Event;
        if (response && response.id) {
          ev = response;
        } else if (response && response.success && response.data) {
          ev = response.data;
        } else {
          this.error.set(response?.message || 'Impossible de charger l’événement.');
          this.loading.set(false);
          return;
        }

        this.enrichEventNames(ev).then((enriched) => {
          this.event.set(enriched);
          this.loading.set(false);
        }).catch(() => {
          this.event.set(ev);
          this.loading.set(false);
        });
      },
      error: (err) => {
        console.error('❌ Erreur de chargement:', err);
        this.error.set('Erreur lors du chargement de l’événement.');
        this.loading.set(false);
      },
    });
  }

  private async enrichEventNames(event: Event): Promise<Event> {
    const enriched = { ...event };

    if (event.churchId) {
      try {
        const churchResp = await this.churchService.getChurchById(event.churchId).toPromise();
        if (churchResp?.success && churchResp.data) {
          enriched.churchName = churchResp.data.name;
        }
      } catch (e) {}
    }

    if (event.siteId) {
      try {
        const siteResp = await this.churchService.getSiteById(event.siteId).toPromise();
        if (siteResp?.success && siteResp.data) {
          enriched.siteName = siteResp.data.name;
        }
      } catch (e) {}
    }

    return enriched;
  }

  // ───────────────────────────────────────────────────────────────
  // ACTIONS
  // ───────────────────────────────────────────────────────────────

  deleteEvent(): void {
    const ev = this.event();
    if (!ev) return;

    if (confirm(`Êtes-vous sûr de vouloir supprimer l’événement « ${ev.title} » ?`)) {
      this.deleting.set(true);
      this.eventService
        .delete(ev.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (success) => {
            this.deleting.set(false);
            if (success) {
              this.router.navigate(['/dashboard/evenements']);
            } else {
              this.error.set('Erreur lors de la suppression.');
            }
          },
          error: (err) => {
            console.error('❌ Erreur lors de la suppression:', err);
            this.error.set('Une erreur est survenue lors de la suppression.');
            this.deleting.set(false);
          },
        });
    }
  }

  cancelEvent(): void {
    const ev = this.event();
    if (!ev) return;

    if (ev.status === EventStatus.Cancelled) {
      this.error.set('Cet événement est déjà annulé.');
      return;
    }

    if (confirm(`Confirmer l’annulation de l’événement « ${ev.title} » ?`)) {
      this.cancelling.set(true);
      this.eventService
        .cancel(ev.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response: any) => {
            this.cancelling.set(false);
            if (response && response.success && response.data) {
              this.event.set(response.data);
            } else if (response && response.id) {
              this.event.set(response);
            } else {
              this.error.set(response?.message || 'Erreur lors de l’annulation.');
            }
          },
          error: (err) => {
            console.error('❌ Erreur lors de l’annulation:', err);
            this.error.set('Une erreur est survenue lors de l’annulation.');
            this.cancelling.set(false);
          },
        });
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
    return `ev-status-badge ev-status-badge--${color}`;
  }

  getTypeLabel(type: string): string {
    return EventUtils.getTypeLabel(type as any);
  }

  getTypeColor(type: string): string {
    return EventUtils.getTypeColor(type as any);
  }

  getTypeClass(type: string): string {
    const color = this.getTypeColor(type);
    return `ev-type-badge ev-type-badge--${color}`;
  }

  formatDate(date: string): string {
    return EventUtils.getFormattedDate(date);
  }

  formatDateTime(date: string): string {
    return EventUtils.getFormattedDateTime(date);
  }

  getFormattedPrice(price: number, currency: string): string {
    return EventUtils.getFormattedPrice(price, currency);
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
    return `ev-payment-status ev-payment-status--${color}`;
  }

  // ── FORMULES ──
  getFormulaPrice(formula: EventFormula): string {
    return this.getFormattedPrice(formula.price, formula.currency);
  }

  getFormulaStatus(formula: EventFormula): string {
    return formula.isActive ? 'Actif' : 'Inactif';
  }

  getFormulaStatusClass(formula: EventFormula): string {
    return formula.isActive ? 'ev-formula-status--active' : 'ev-formula-status--inactive';
  }

  canEdit(): boolean {
    const ev = this.event();
    if (!ev) return false;
    return ev.status !== EventStatus.Completed && ev.status !== EventStatus.Cancelled;
  }

  canCancel(): boolean {
    const ev = this.event();
    if (!ev) return false;
    return ev.status !== EventStatus.Completed && ev.status !== EventStatus.Cancelled;
  }

  canCheckIn(): boolean {
    const ev = this.event();
    if (!ev) return false;
    return ev.status === EventStatus.Ongoing || ev.status === EventStatus.Scheduled;
  }

  canDelete(): boolean {
    const ev = this.event();
    if (!ev) return false;
    return ev.status === EventStatus.Cancelled || ev.status === EventStatus.Completed;
  }
}
