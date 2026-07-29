import { Component, OnInit, signal, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Events } from '../../../../../core/services/Event/events';
import { ChurchParticipationStat } from '../../../../../core/models/Events/event.model';

@Component({
  selector: 'app-event-church-stats',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './event-church-stats.html',
  styleUrls: ['./event-church-stats.scss'],
})
export class EventChurchStats implements OnInit {
  private destroyRef = inject(DestroyRef);
  private eventService = inject(Events);
  private route = inject(ActivatedRoute);

  stats = signal<ChurchParticipationStat[]>([]);
  globalTotals = signal<ChurchParticipationStat | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const eventId = this.route.snapshot.paramMap.get('id');
    if (!eventId) {
      this.error.set('Identifiant d’événement manquant.');
      this.loading.set(false);
      return;
    }

    this.eventService.getChurchStatistics(eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.isSuccess) {
            this.stats.set(response.statistics);
            this.globalTotals.set(response.globalTotals || null);
          } else {
            this.error.set(response.errorMessage || 'Erreur lors du chargement des statistiques.');
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error('❌ Erreur statistiques par église:', err);
          this.error.set('Une erreur est survenue.');
          this.loading.set(false);
        },
      });
  }

  formatMoney(amount: number): string {
    return `${amount.toLocaleString('fr-FR')} FCFA`;
  }
}
