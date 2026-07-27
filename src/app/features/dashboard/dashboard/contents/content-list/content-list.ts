// src/app/features/dashboard/dashboard/medias/content-list/content-list.component.ts

import { Component, OnInit, OnDestroy, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';

import { Permissions } from '../../../../../core/services/Permissions/permissions';
import {
  Content,
  ContentType,
  ContentFilter,
  ContentUtils,
  DEFAULT_CONTENT_FILTER,
  ContentTypeLabels,
} from '../../../../../core/models/Communication/content.model';
import { Contents } from '../../../../../core/services/Content/contents';

@Component({
  selector: 'app-content-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './content-list.html',
  styleUrls: ['./content-list.scss'],
})
export class ContentList implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private contentService = inject(Contents);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  public permissions = inject(Permissions);

  // ── Expose Math for template ──
  readonly Math = Math;

  // ── État ──
  contents = signal<Content[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  totalCount = signal(0);
  currentPage = signal(1);
  totalPages = signal(1);
  pageSize = signal(20);

  // ── Suppression ──
  deletingId = signal<string | null>(null);
  showDeleteModal = signal(false);
  contentToDelete = signal<Content | null>(null);

  // ── Filtres ──
  filterForm: FormGroup;

  // ── Options ──
  readonly contentTypeOptions = Object.values(ContentType).map((type) => ({
    value: type,
    label: ContentTypeLabels[type],
  }));

  readonly typeOptions = [
    { value: '', label: 'Tous les types' },
    ...this.contentTypeOptions,
  ];

  readonly statusOptions = [
    { value: '', label: 'Tous' },
    { value: 'published', label: 'Publié' },
    { value: 'draft', label: 'Brouillon' },
  ];

  readonly featuredOptions = [
    { value: '', label: 'Tous' },
    { value: 'true', label: 'Mis en avant' },
    { value: 'false', label: 'Non mis en avant' },
  ];

  readonly pageSizeOptions = [10, 20, 50, 100];

  // ── Statistiques calculées ──
  // ── Statistiques calculées (alternative) ──
  stats = computed(() => {
    const list = this.contents();
    if (!list.length) return null;

    const published = list.filter(c => c.isPublished);
    const drafts = list.filter(c => !c.isPublished);
    const featured = list.filter(c => c.isFeatured);
    const byType: Record<ContentType, number> = {} as any;
    Object.values(ContentType).forEach(t => byType[t] = 0);
    list.forEach(c => byType[c.type] = (byType[c.type] || 0) + 1);
    const totalViews = list.reduce((sum, c) => sum + c.views, 0);
    const totalDownloads = list.reduce((sum, c) => sum + c.downloads, 0);

    return {
      total: list.length,
      published: published.length,
      drafts: drafts.length,
      featured: featured.length,
      byType,
      totalViews,
      totalDownloads,
      averageViews: Math.round(totalViews / list.length),
      averageDownloads: Math.round(totalDownloads / list.length),
    };
  });

  // ── Helpers ──
  getTypeLabel = ContentUtils.getTypeLabel;
  getTypeIcon = ContentUtils.getTypeIcon;
  getTypeColor = ContentUtils.getTypeColor;
  getStatusLabel(isPublished: boolean): string {
    return isPublished ? 'Publié' : 'Brouillon';
  }

  getStatusColor(isPublished: boolean): string {
    return isPublished ? 'success' : 'warning';
  }
  formatDuration = ContentUtils.formatDuration;
  formatFileSize = ContentUtils.formatFileSize;
  getFormattedDate = ContentUtils.getFormattedDateTime;

  constructor() {
    this.filterForm = this.fb.group({
      search: [''],
      type: [''],
      status: [''],
      isFeatured: [''],
      speaker: [''],
      series: [''],
    });
  }

  ngOnInit(): void {
    this.loadContents();

    // Réactivité des filtres
    this.filterForm.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadContents();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Chargement ──
  loadContents(): void {
    this.loading.set(true);
    this.error.set(null);

    const raw = this.filterForm.value;
    const filter: ContentFilter = {
      ...DEFAULT_CONTENT_FILTER,
      page: this.currentPage(),
      pageSize: this.pageSize(),
      title: raw.search || undefined,
      type: raw.type || undefined,
      speaker: raw.speaker || undefined,
      series: raw.series || undefined,
    };

    // Gestion du statut
    if (raw.status === 'published') filter.isPublished = true;
    else if (raw.status === 'draft') filter.isPublished = false;

    // Gestion de la mise en avant
    if (raw.isFeatured === 'true') filter.isFeatured = true;
    else if (raw.isFeatured === 'false') filter.isFeatured = false;

    this.contentService
      .getAll(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.loading.set(false);
          if (response.success && response.data) {
            this.contents.set(response.data.items || []);
            this.totalCount.set(response.data.totalCount || 0);
            this.currentPage.set(response.data.currentPage || 1);
            this.totalPages.set(response.data.totalPages || 1);
            this.pageSize.set(response.data.pageSize || 20);
          } else {
            this.error.set(response.message || 'Erreur lors du chargement.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur chargement contenus:', err);
          this.loading.set(false);
          this.error.set('Erreur lors du chargement des contenus.');
        },
      });
  }

  // ── Pagination ──
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadContents();
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
    this.loadContents();
  }

  // ── Actions ──
  viewContent(id: string): void {
    this.router.navigate(['/dashboard/medias/bibliotheque', id]);
  }

  editContent(id: string, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/dashboard/medias/bibliotheque', id, 'edit']);
  }

  // ── Publication ──
  togglePublish(content: Content, event: Event): void {
    event.stopPropagation();
    const newStatus = !content.isPublished;
    const action = newStatus ? 'publier' : 'dépublier';
    if (!confirm(`Voulez-vous ${action} le contenu "${content.title}" ?`)) return;

    this.contentService
      .publish(content.id, {
        isPublished: newStatus,
        publishedAt: newStatus ? new Date().toISOString() : undefined,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.loadContents();
          } else {
            this.error.set(response.message || `Erreur lors de la ${action}.`);
          }
        },
        error: (err) => {
          console.error('❌ Erreur publication:', err);
          this.error.set(`Erreur lors de la ${action}.`);
        },
      });
  }

  // ── Suppression ──
  openDeleteModal(content: Content, event: Event): void {
    event.stopPropagation();
    this.contentToDelete.set(content);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.contentToDelete.set(null);
  }

  confirmDelete(): void {
    const content = this.contentToDelete();
    if (!content) return;

    this.deletingId.set(content.id);
    this.contentService
      .delete(content.id)
      .pipe(
        finalize(() => this.deletingId.set(null)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.closeDeleteModal();
          if (response.success) {
            this.loadContents();
          } else {
            this.error.set(response.message || 'Erreur lors de la suppression.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur suppression:', err);
          this.error.set('Erreur lors de la suppression.');
          this.closeDeleteModal();
        },
      });
  }

  // ── Filtres ──
  resetFilters(): void {
    this.filterForm.reset({
      search: '',
      type: '',
      status: '',
      isFeatured: '',
      speaker: '',
      series: '',
    });
    this.currentPage.set(1);
    this.loadContents();
  }

  refresh(): void {
    this.loadContents();
  }

  // ── Navigation ──
  goToCreate(): void {
    this.router.navigate(['/dashboard/medias/bibliotheque/new']);
  }

  // ── Helpers ──
  getContentTypeClass(type: ContentType): string {
    const color = this.getTypeColor(type);
    return `cl-type-badge cl-type-badge--${color}`;
  }

  getStatusClass(isPublished: boolean): string {
    const color = this.getStatusColor(isPublished);
    return `cl-status-badge cl-status-badge--${color}`;
  }
}
