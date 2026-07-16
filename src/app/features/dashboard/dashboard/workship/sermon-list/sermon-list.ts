// src/app/features/dashboard/dashboard/events/sermon-list/sermon-list.ts
import { Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import {
  Sermon,
  SermonFilter,
  SermonStatus,
  SermonStatusLabels,
  SermonMediaType,
  DEFAULT_SERMON_FILTER,
  SermonUtils,
} from '../../../../../core/models/Events/sermon.model';
import { Sermons } from '../../../../../core/services/Sermon/sermons';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: SermonStatus.Draft, label: SermonStatusLabels[SermonStatus.Draft] },
  { value: SermonStatus.Published, label: SermonStatusLabels[SermonStatus.Published] },
  { value: SermonStatus.Archived, label: SermonStatusLabels[SermonStatus.Archived] },
];

const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

@Component({
  selector: 'app-sermon-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './sermon-list.html',
  styleUrl: './sermon-list.scss',
})
export class SermonList implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  readonly SermonMediaType = SermonMediaType;

  searchControl = new FormControl('');
  statusControl = new FormControl('');
  preacherControl = new FormControl('');
  seriesControl = new FormControl('');

  sermons = signal<Sermon[]>([]);
  series = signal<string[]>([]);
  preachers = signal<string[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  currentPage = signal(1);
  pageSize = signal(12);
  totalCount = signal(0);

  // ── Suivi des actions en cours par sermon (pour désactiver les boutons) ──
  publishing = signal<string | null>(null);
  archiving = signal<string | null>(null);
  deleting = signal<string | null>(null);

  // ── Panneau de détail développé inline (pas de page séparée) ──
  expandedId = signal<string | null>(null);

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  isEmpty = computed(() => !this.loading() && this.sermons().length === 0);

  private filter: SermonFilter = { ...DEFAULT_SERMON_FILTER };

  constructor(
    private sermonService: Sermons,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSermons();
    this.loadSeries();

    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadSermons();
      });

    this.statusControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadSermons();
      });

    this.preacherControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadSermons();
      });

    this.seriesControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadSermons();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT
  // ───────────────────────────────────────────────────────────────

  loadSermons(): void {
    this.loading.set(true);
    this.error.set(null);

    this.filter = {
      ...DEFAULT_SERMON_FILTER,
      page: this.currentPage(),
      pageSize: this.pageSize(),
      title: (this.searchControl.value ?? '') || undefined,
      status: (this.statusControl.value as SermonStatus) || undefined,
      preacherName: (this.preacherControl.value ?? '') || undefined,
      series: (this.seriesControl.value ?? '') || undefined,
    };

    this.sermonService
      .getAll(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const items = response?.items ?? [];
          this.sermons.set(items);
          this.totalCount.set(response?.totalCount ?? items.length);
          this.loading.set(false);

          // Extrait les prédicateurs uniques de la page courante pour affiner le filtre
          const names = [...new Set(items.map((s) => s.preacherName).filter(Boolean))];
          this.preachers.set(names);
        },
        error: (err) => {
          console.error('❌ Erreur lors du chargement des sermons:', err);
          this.sermons.set([]);
          this.loading.set(false);
          this.error.set('Impossible de charger la bibliothèque de sermons.');
        },
      });
  }

  private loadSeries(): void {
    this.sermonService
      .getSeries()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => this.series.set(list ?? []),
        error: () => this.series.set([]),
      });
  }

  refresh(): void {
    this.loadSermons();
  }

  // ───────────────────────────────────────────────────────────────
  // PAGINATION
  // ───────────────────────────────────────────────────────────────

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadSermons();
  }

  previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  onPageSizeChange(size: string): void {
    this.pageSize.set(Number(size));
    this.currentPage.set(1);
    this.loadSermons();
  }

  resetFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.statusControl.setValue('', { emitEvent: false });
    this.preacherControl.setValue('', { emitEvent: false });
    this.seriesControl.setValue('', { emitEvent: false });
    this.currentPage.set(1);
    this.loadSermons();
  }

  // ───────────────────────────────────────────────────────────────
  // DÉTAIL INLINE (pas de page séparée pour l'instant)
  // ───────────────────────────────────────────────────────────────

  toggleExpand(sermon: Sermon): void {
    const isExpanding = this.expandedId() !== sermon.id;
    this.expandedId.set(isExpanding ? sermon.id : null);

    // ✅ Comptabilise une vue à l'ouverture du détail d'un sermon publié
    if (isExpanding && sermon.status === SermonStatus.Published) {
      this.sermonService.registerView(sermon.id).subscribe();
    }
  }

  isExpanded(sermon: Sermon): boolean {
    return this.expandedId() === sermon.id;
  }

  // ───────────────────────────────────────────────────────────────
  // ACTIONS
  // ───────────────────────────────────────────────────────────────

  createSermon(): void {
    this.router.navigate(['/dashboard/cultes/sermons/new']);
  }

  publishSermon(sermon: Sermon, event: Event): void {
    event.stopPropagation();
    if (!SermonUtils.canPublish(sermon)) {
      this.error.set("Ce sermon n'a pas encore de média associé. Ajoutez-en un avant de publier.");
      return;
    }

    this.publishing.set(sermon.id);
    this.sermonService
      .publish(sermon.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.publishing.set(null);
          if (updated && updated.isSuccess !== false) {
            this.replaceInList(updated);
          } else {
            this.error.set(updated?.errorMessage || 'Erreur lors de la publication.');
          }
        },
        error: (err) => {
          this.publishing.set(null);
          this.error.set(err?.error?.message || 'Erreur lors de la publication.');
        },
      });
  }

  archiveSermon(sermon: Sermon, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Archiver « ${sermon.title} » ? Il ne sera plus visible dans la bibliothèque publique.`)) return;

    this.archiving.set(sermon.id);
    this.sermonService
      .archive(sermon.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.archiving.set(null);
          if (updated && updated.isSuccess !== false) {
            this.replaceInList(updated);
          } else {
            this.error.set(updated?.errorMessage || "Erreur lors de l'archivage.");
          }
        },
        error: (err) => {
          this.archiving.set(null);
          this.error.set(err?.error?.message || "Erreur lors de l'archivage.");
        },
      });
  }

  editSermon(sermon: Sermon, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/dashboard/cultes/sermons', sermon.id, 'edit']);
  }

  deleteSermon(sermon: Sermon, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Supprimer définitivement « ${sermon.title} » ? Cette action est irréversible.`)) return;

    this.deleting.set(sermon.id);
    this.sermonService
      .delete(sermon.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleting.set(null);
          this.loadSermons();
        },
        error: (err) => {
          this.deleting.set(null);
          console.error('❌ Erreur lors de la suppression:', err);
          this.error.set('Impossible de supprimer ce sermon.');
        },
      });
  }

  playAudio(sermon: Sermon, event: Event): void {
    event.stopPropagation();
    const audio = SermonUtils.getAudioMedia(sermon);
    if (audio?.fileId) {
      window.open(this.sermonService.getMediaDownloadUrl(sermon.id, audio.fileId), '_blank');
    }
  }

  openVideo(sermon: Sermon, event: Event): void {
    event.stopPropagation();
    const video = SermonUtils.getVideoMedia(sermon);
    if (video?.externalUrl) {
      window.open(video.externalUrl, '_blank');
    }
  }

  downloadDocument(sermon: Sermon, mediaId: string, fileId: string, event: Event): void {
    event.stopPropagation();
    window.open(this.sermonService.getMediaDownloadUrl(sermon.id, fileId), '_blank');
  }

  private replaceInList(updated: Sermon): void {
    this.sermons.update((list) => list.map((s) => (s.id === updated.id ? updated : s)));
  }

  // ───────────────────────────────────────────────────────────────
  // HELPERS D'AFFICHAGE
  // ───────────────────────────────────────────────────────────────

  getInitials(name: string): string {
    return SermonUtils.getInitials(name);
  }

  formatDate(date: string): string {
    return SermonUtils.getFormattedDate(date);
  }

  getStatusLabel(status: SermonStatus): string {
    return SermonUtils.getStatusLabel(status);
  }

  getStatusColor(status: SermonStatus): string {
    return SermonUtils.getStatusColor(status);
  }

  getStatusClass(status: SermonStatus): string {
    return `sl-status-badge sl-status-badge--${this.getStatusColor(status)}`;
  }

  getAudio(sermon: Sermon) {
    return SermonUtils.getAudioMedia(sermon);
  }

  getVideo(sermon: Sermon) {
    return SermonUtils.getVideoMedia(sermon);
  }

  getDocuments(sermon: Sermon) {
    return SermonUtils.getDocumentMedia(sermon);
  }

  canPublish(sermon: Sermon): boolean {
    return SermonUtils.canPublish(sermon);
  }

  get pageRangeLabel(): string {
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize(), this.totalCount());
    return this.totalCount() === 0 ? '0 sermon' : `${start}–${end} sur ${this.totalCount()}`;
  }
}
