// src/app/features/dashboard/dashboard/offerings/offering-dashboard/offering-dashboard.ts

import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Chart, registerables } from 'chart.js';

import { Offerings } from '../../../../../core/services/Finances/offerings';
import { Church as ChurchService } from '../../../../../core/services/Church/church';
import { Permissions } from '../../../../../core/services/Permissions/permissions';
import {
  OfferingDashboardDto,
  OfferingDashboardFilter
} from '../../../../../core/models/Finances/offering.model';

Chart.register(...registerables);

/**
 * Tableau de bord des offrandes : totaux (période + dimanche sélectionné),
 * répartition par église, par type et par jour, avec graphiques.
 * Le périmètre (église / national / international / global) est appliqué par
 * le serveur selon le rôle de l'utilisateur.
 */
@Component({
  selector: 'app-offering-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './offering-dashboard.html',
  styleUrl: './offering-dashboard.scss',
})
export class OfferingDashboard implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private isBrowser: boolean;

  private typeChart: Chart | null = null;
  private churchChart: Chart | null = null;
  private dayChart: Chart | null = null;

  dashboard: OfferingDashboardDto | null = null;
  loading = false;
  error: string | null = null;

  churches: { id: string; name: string }[] = [];

  filter: OfferingDashboardFilter = {
    from: '',
    to: '',
    churchId: '',
    day: ''
  };

  constructor(
    private offeringsService: Offerings,
    private churchService: ChurchService,
    public permissions: Permissions,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    this.resetToCurrentPeriod();
    this.loadChurches();
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
  }

  /** Période par défaut : mois en cours ; dimanche = dernier dimanche écoulé. */
  resetToCurrentPeriod(): void {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    this.filter.from = this.toInputDate(firstDay);
    this.filter.to = this.toInputDate(now);
    this.filter.day = this.toInputDate(this.lastSunday(now));
  }

  private lastSunday(reference: Date): Date {
    const d = new Date(reference);
    d.setDate(d.getDate() - d.getDay()); // getDay() = 0 le dimanche
    return d;
  }

  private toInputDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private loadChurches(): void {
    // Le filtre par église n'est utile qu'aux périmètres multi-églises, mais on
    // charge la liste sans risque : le serveur refuse toute église hors périmètre.
    this.churchService
      .getAllChurches()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.churches = response.data.map((c) => ({ id: c.id, name: c.name }));
          }
        },
        error: () => {
          this.churches = [];
        }
      });
  }

  loadDashboard(): void {
    this.loading = true;
    this.error = null;

    this.offeringsService
      .getOfferingDashboard({
        from: this.filter.from || undefined,
        to: this.filter.to || undefined,
        churchId: this.filter.churchId || undefined,
        day: this.filter.day || undefined
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success && response.data) {
            this.dashboard = response.data;
            this.cdr.detectChanges();
            requestAnimationFrame(() => this.createCharts());
          } else {
            this.dashboard = null;
            this.error = response.message || 'Tableau de bord indisponible.';
          }
        },
        error: () => {
          this.loading = false;
          this.dashboard = null;
          this.error = 'Impossible de charger le tableau de bord des offrandes.';
        }
      });
  }

  /** Les églises ne sont affichées qu'aux périmètres globaux. */
  get showChurchFilter(): boolean {
    return this.dashboard?.scopeLevel === 'global';
  }

  // ──────────────────────────────────────────────────────────────
  // GRAPHIQUES
  // ──────────────────────────────────────────────────────────────

  private createCharts(): void {
    if (!this.isBrowser || !this.dashboard) return;

    this.createTypeChart();
    this.createChurchChart();
    this.createDayChart();
  }

  private createTypeChart(): void {
    const canvas = document.getElementById('offeringTypeChart') as HTMLCanvasElement | null;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !this.dashboard) return;

    if (this.typeChart) { this.typeChart.destroy(); this.typeChart = null; }

    const items = this.dashboard.byType ?? [];
    if (!items.length) return;

    const palette = ['#6C5CE7', '#00B894', '#FDCB6E', '#E17055', '#74B9FF', '#00CEC9', '#FF7675', '#A29BFE'];

    this.typeChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: items.map((i) => i.label),
        datasets: [{
          data: items.map((i) => i.amount),
          backgroundColor: palette.slice(0, items.length),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 18, usePointStyle: true, font: { size: 12 } } },
          tooltip: {
            callbacks: {
              label: (item) => {
                const row = items[item.dataIndex];
                return `${row.label} : ${this.formatAmount(row.amount)} (${row.percentage} %)`;
              }
            }
          }
        }
      }
    });
  }

  private createChurchChart(): void {
    const canvas = document.getElementById('offeringChurchChart') as HTMLCanvasElement | null;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !this.dashboard) return;

    if (this.churchChart) { this.churchChart.destroy(); this.churchChart = null; }

    const rows = (this.dashboard.byChurch ?? []).filter((r) => r.amount > 0 || r.count > 0);
    if (!rows.length) return;

    this.churchChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: rows.map((r) => r.churchName || r.churchId),
        datasets: [{
          label: 'Offrandes (FCFA)',
          data: rows.map((r) => r.amount),
          backgroundColor: '#6C5CE7',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 0 } },
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }
        }
      }
    });
  }

  private createDayChart(): void {
    const canvas = document.getElementById('offeringDayChart') as HTMLCanvasElement | null;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !this.dashboard) return;

    if (this.dayChart) { this.dayChart.destroy(); this.dayChart = null; }

    const points = this.dashboard.byDay ?? [];
    if (!points.length) return;

    this.dayChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: points.map((p) => this.formatDayLabel(p.date)),
        datasets: [{
          label: 'Offrandes du jour',
          data: points.map((p) => p.amount),
          borderColor: '#6C5CE7',
          backgroundColor: 'rgba(108, 92, 231, 0.1)',
          fill: true,
          tension: 0.35,
          pointRadius: points.map((p) => (p.isSunday ? 6 : 3)),
          pointBackgroundColor: points.map((p) => (p.isSunday ? '#E17055' : '#6C5CE7')),
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => {
                const p = points[item.dataIndex];
                return `${this.formatAmount(p.amount)} — ${p.count} offrande(s)${p.isSunday ? ' • dimanche' : ''}`;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }
        }
      }
    });
  }

  private destroyCharts(): void {
    if (this.typeChart) { this.typeChart.destroy(); this.typeChart = null; }
    if (this.churchChart) { this.churchChart.destroy(); this.churchChart = null; }
    if (this.dayChart) { this.dayChart.destroy(); this.dayChart = null; }
  }

  // ──────────────────────────────────────────────────────────────
  // AFFICHAGE
  // ──────────────────────────────────────────────────────────────

  formatAmount(amount: number): string {
    return `${(amount ?? 0).toLocaleString('fr-FR')} FCFA`;
  }

  formatDayLabel(date: string): string {
    const parsed = new Date(`${date}T00:00:00`);
    if (isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  formatLongDate(date: string): string {
    const parsed = new Date(`${date}T00:00:00`);
    if (isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString('fr-FR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });
  }

  getScopeBadge(): string {
    switch (this.dashboard?.scopeLevel) {
      case 'global': return 'Périmètre global';
      case 'national': return 'Périmètre national';
      case 'international': return 'Périmètre international';
      case 'none': return 'Aucun périmètre';
      default: return 'Mon église';
    }
  }

  /** Libellé du type dans la ligne de total (tableau par type). */
  getTypeTotal(): number {
    return this.dashboard?.totalAmount ?? 0;
  }

  /** Nombre de dimanches parmi les jours de la période. */
  countSundays(days: { isSunday: boolean }[]): number {
    return (days ?? []).filter((d) => d.isSunday).length;
  }
}
