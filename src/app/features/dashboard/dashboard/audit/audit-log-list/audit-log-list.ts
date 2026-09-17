// src/app/features/dashboard/dashboard/audit/audit-log-list/audit-log-list.ts

import {
  Component, Inject, OnDestroy, OnInit, PLATFORM_ID, signal, ChangeDetectorRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Chart, registerables } from 'chart.js';

import { AuditServiceApi } from '../../../../../core/services/Audit/audit';
import { Permissions } from '../../../../../core/services/Permissions/permissions';
import {
  AuditLogEntry,
  AuditLogDetail,
  AuditLogFilter,
  AuditStatistics,
  AUDIT_ACTION_OPTIONS,
  AUDIT_CATEGORY_OPTIONS,
  AUDIT_SEVERITY_OPTIONS
} from '../../../../../core/models/Audit/audit.model';

Chart.register(...registerables);

/**
 * Journal d'audit : sécurité, suivi des modifications et traçabilité.
 * Filtres, statistiques, graphiques et détail (avant/après).
 */
@Component({
  selector: 'app-audit-log-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './audit-log-list.html',
  styleUrl: './audit-log-list.scss',
})
export class AuditLogList implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private isBrowser: boolean;

  private severityChart: Chart | null = null;
  private dailyChart: Chart | null = null;

  logs = signal<AuditLogEntry[]>([]);
  totalCount = signal(0);
  currentPage = signal(1);
  totalPages = signal(1);
  pageSize = 20;
  loading = signal(false);
  error = signal<string | null>(null);

  statistics = signal<AuditStatistics | null>(null);

  detail: AuditLogDetail | null = null;
  detailLoading = false;

  readonly severityOptions = AUDIT_SEVERITY_OPTIONS;
  readonly categoryOptions = AUDIT_CATEGORY_OPTIONS;
  readonly actionOptions = AUDIT_ACTION_OPTIONS;

  filter = {
    startDate: '',
    endDate: '',
    category: '',
    severity: '',
    action: '',
    searchTerm: ''
  };

  constructor(
    private auditApi: AuditServiceApi,
    public permissions: Permissions,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    // Période par défaut : 30 derniers jours.
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 30);

    this.filter.startDate = this.toInputDate(start);
    this.filter.endDate = this.toInputDate(today);

    this.loadStatistics();
    this.loadLogs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
  }

  private toInputDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT
  // ──────────────────────────────────────────────────────────────

  loadLogs(): void {
    this.loading.set(true);
    this.error.set(null);

    const filter: AuditLogFilter = {
      page: this.currentPage(),
      pageSize: this.pageSize,
      startDate: this.filter.startDate || undefined,
      endDate: this.filter.endDate ? `${this.filter.endDate}T23:59:59` : undefined,
      searchTerm: this.filter.searchTerm || undefined,
      categories: this.filter.category ? [this.filter.category] : undefined,
      severities: this.filter.severity ? [this.filter.severity] : undefined,
      actions: this.filter.action ? [this.filter.action] : undefined
    };

    this.auditApi
      .getList(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          if (response.success && response.data) {
            this.logs.set(response.data.items ?? []);
            this.totalCount.set(response.data.totalCount ?? 0);
            this.totalPages.set(response.data.totalPages || 1);
          } else {
            this.logs.set([]);
            this.error.set(response.message || 'Impossible de charger le journal d’audit.');
          }
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Impossible de charger le journal d’audit.');
        }
      });
  }

  loadStatistics(): void {
    this.auditApi
      .getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.statistics.set(response.data);
            this.cdr.detectChanges();
            requestAnimationFrame(() => this.createCharts());
          }
        }
      });
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadLogs();
  }

  resetFilters(): void {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 30);

    this.filter = {
      startDate: this.toInputDate(start),
      endDate: this.toInputDate(today),
      category: '',
      severity: '',
      action: '',
      searchTerm: ''
    };
    this.applyFilters();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadLogs();
  }

  // ──────────────────────────────────────────────────────────────
  // DÉTAIL
  // ──────────────────────────────────────────────────────────────

  openDetail(entry: AuditLogEntry): void {
    this.detailLoading = true;
    this.detail = null;

    this.auditApi
      .getById(entry.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.detailLoading = false;
          if (response.success && response.data) this.detail = response.data;
        },
        error: () => (this.detailLoading = false)
      });
  }

  closeDetail(): void {
    this.detail = null;
  }

  /** Lignes du diff champ par champ (suivi des modifications). */
  getFieldChanges(): { fieldName: string; oldValue?: string; newValue?: string }[] {
    if (!this.detail) return [];

    if (this.detail.fieldChanges?.length) {
      return this.detail.fieldChanges.map((c) => ({
        fieldName: c.fieldName,
        oldValue: c.oldValue,
        newValue: c.newValue
      }));
    }

    // Repli : diff des snapshots si le backend n'a pas détaillé les champs.
    const oldSnap = this.detail.oldSnapshot ?? {};
    const newSnap = this.detail.newSnapshot ?? {};
    const keys = [...new Set([...Object.keys(oldSnap), ...Object.keys(newSnap)])];

    return keys
      .filter((k) => JSON.stringify(oldSnap[k]) !== JSON.stringify(newSnap[k]))
      .map((k) => ({
        fieldName: k,
        oldValue: this.stringify(oldSnap[k]),
        newValue: this.stringify(newSnap[k])
      }));
  }

  private stringify(value: unknown): string {
    if (value === null || value === undefined) return '—';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }

  // ──────────────────────────────────────────────────────────────
  // GRAPHIQUES
  // ──────────────────────────────────────────────────────────────

  private createCharts(): void {
    if (!this.isBrowser) return;
    this.createSeverityChart();
    this.createDailyChart();
  }

  private createSeverityChart(): void {
    const canvas = document.getElementById('auditSeverityChart') as HTMLCanvasElement | null;
    const ctx = canvas?.getContext('2d');
    const stats = this.statistics();
    if (!ctx || !stats) return;

    if (this.severityChart) { this.severityChart.destroy(); this.severityChart = null; }

    const items = stats.severityDistribution ?? [];
    if (!items.length) return;

    const colors: Record<string, string> = {
      Info: '#0984E3', Warning: '#FDCB6E', Error: '#E17055', Critical: '#D63031'
    };

    this.severityChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: items.map((i) => i.label),
        datasets: [{
          data: items.map((i) => i.count),
          backgroundColor: items.map((i) => colors[i.severity] ?? '#6C5CE7'),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, font: { size: 12 } } }
        }
      }
    });
  }

  private createDailyChart(): void {
    const canvas = document.getElementById('auditDailyChart') as HTMLCanvasElement | null;
    const ctx = canvas?.getContext('2d');
    const stats = this.statistics();
    if (!ctx || !stats) return;

    if (this.dailyChart) { this.dailyChart.destroy(); this.dailyChart = null; }

    const points = stats.dailyActivity ?? [];
    if (!points.length) return;

    this.dailyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: points.map((p) => p.date),
        datasets: [
          {
            label: 'Activité',
            data: points.map((p) => p.count),
            borderColor: '#6C5CE7',
            backgroundColor: 'rgba(108, 92, 231, 0.1)',
            fill: true,
            tension: 0.35,
            pointRadius: 2
          },
          {
            label: 'Critiques',
            data: points.map((p) => p.criticalCount),
            borderColor: '#D63031',
            backgroundColor: 'transparent',
            borderDash: [5, 4],
            tension: 0.35,
            pointRadius: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, font: { size: 12 } } }
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { precision: 0 } }
        }
      }
    });
  }

  private destroyCharts(): void {
    if (this.severityChart) { this.severityChart.destroy(); this.severityChart = null; }
    if (this.dailyChart) { this.dailyChart.destroy(); this.dailyChart = null; }
  }

  // ──────────────────────────────────────────────────────────────
  // AFFICHAGE
  // ──────────────────────────────────────────────────────────────

  getSeverityClass(severity: string): string {
    switch (severity) {
      case 'Critical': return 'al-sev--critical';
      case 'Error': return 'al-sev--error';
      case 'Warning': return 'al-sev--warning';
      default: return 'al-sev--info';
    }
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
}
