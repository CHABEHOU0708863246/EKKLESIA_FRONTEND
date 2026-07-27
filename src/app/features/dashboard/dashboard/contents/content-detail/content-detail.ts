// src/app/features/dashboard/dashboard/medias/content-detail/content-detail.component.ts

import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Content, ContentType, ContentUtils } from '../../../../../core/models/Communication/content.model';
import { Permissions } from '../../../../../core/services/Permissions/permissions';
import { Contents } from '../../../../../core/services/Content/contents';

@Component({
  selector: 'app-content-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './content-detail.html',
  styleUrls: ['./content-detail.scss'],
})
export class ContentDetail implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private contentService = inject(Contents);
  private sanitizer = inject(DomSanitizer);
  public permissions = inject(Permissions);

  // ── État ──
  content = signal<Content | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  deleting = signal(false);
  togglingPublish = signal(false);
  fileObjectUrl = signal<string | null>(null);
  fileLoadFailed = signal(false);

  // ── Helpers ──
  readonly ContentType = ContentType;
  readonly Math = Math;

  // ── Méthodes du service ──
  getTypeLabel = ContentUtils.getTypeLabel;
  getTypeIcon = ContentUtils.getTypeIcon;
  getTypeColor = ContentUtils.getTypeColor;
  getStatusLabel(isPublished: boolean): string {
    return isPublished ? 'Publié' : 'Brouillon';
  }

  getStatusColor(isPublished: boolean): string {
    return isPublished ? 'success' : 'warning';
  }
  formatFileSize = ContentUtils.formatFileSize;
  formatDuration = ContentUtils.formatDuration;
  getFormattedDate = ContentUtils.getFormattedDate;
  getFormattedDateTime = ContentUtils.getFormattedDateTime;

  // ── Lifecycle ──
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Identifiant du contenu manquant.');
      this.loading.set(false);
      return;
    }
    this.loadContent(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Libérer l’URL objet pour éviter les fuites mémoire
    if (this.fileObjectUrl()) {
      URL.revokeObjectURL(this.fileObjectUrl()!);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT DU CONTENU
  // ──────────────────────────────────────────────────────────────

  private loadContent(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.contentService
      .getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          let data: Content | null = null;
          if (response && response.success && response.data) {
            data = response.data as Content;
          } else if (response && response.id) {
            data = response as Content;
          }

          if (data) {
            this.content.set(data);
            // Incrémenter les vues automatiquement
            this.incrementView(data.id);
            // Charger le fichier si nécessaire
            if (data.url && data.type !== ContentType.Article) {
              this.loadFileContent(data.url);
            }
          } else {
            this.error.set('Impossible de charger ce contenu.');
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error('❌ Erreur chargement:', err);
          this.error.set('Erreur lors du chargement du contenu.');
          this.loading.set(false);
        },
      });
  }

  // ──────────────────────────────────────────────────────────────
  // FICHIER (affichage sécurisé via Blob)
  // ──────────────────────────────────────────────────────────────

  private loadFileContent(fileId: string): void {
    if (!fileId) return;
    this.fileLoadFailed.set(false);

    this.contentService
      .getFile(fileId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          this.fileObjectUrl.set(url);
        },
        error: (err) => {
          console.error('❌ Erreur chargement fichier:', err);
          this.fileLoadFailed.set(true);
        },
      });
  }

  // ──────────────────────────────────────────────────────────────
  // INCRÉMENTATION DES VUES
  // ──────────────────────────────────────────────────────────────

  private incrementView(id: string): void {
    this.contentService
      .incrementViews(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Mettre à jour localement le compteur de vues
            this.content.update((c) => {
              if (c) {
                return { ...c, views: c.views + 1 };
              }
              return c;
            });
          }
        },
        error: (err) => console.warn('⚠️ Erreur incrémentation vues:', err),
      });
  }

  // ──────────────────────────────────────────────────────────────
  // ACTIONS
  // ──────────────────────────────────────────────────────────────

  goBack(): void {
    this.router.navigate(['/dashboard/medias/bibliotheque']);
  }

  editContent(): void {
    const c = this.content();
    if (c) {
      this.router.navigate(['/dashboard/medias/bibliotheque', c.id, 'edit']);
    }
  }

  togglePublish(): void {
    const c = this.content();
    if (!c) return;

    const newStatus = !c.isPublished;
    const action = newStatus ? 'publier' : 'dépublier';

    if (!confirm(`Voulez-vous vraiment ${action} ce contenu ?`)) return;

    this.togglingPublish.set(true);
    this.contentService
      .publish(c.id, { isPublished: newStatus })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.togglingPublish.set(false);
          if (response.success && response.data) {
            this.content.set(response.data as Content);
          } else {
            this.error.set(response.message || 'Erreur lors de la publication.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur publication:', err);
          this.togglingPublish.set(false);
          this.error.set('Une erreur est survenue.');
        },
      });
  }

  toggleFeatured(): void {
    const c = this.content();
    if (!c) return;

    this.contentService
      .update(c.id, { isFeatured: !c.isFeatured })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success && response.data) {
            this.content.set(response.data as Content);
          } else {
            this.error.set(response.message || 'Erreur lors de la mise à jour.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur:', err);
          this.error.set('Une erreur est survenue.');
        },
      });
  }

  deleteContent(): void {
    const c = this.content();
    if (!c) return;

    if (confirm(`Voulez-vous vraiment supprimer le contenu "${c.title}" ?`)) {
      this.deleting.set(true);
      this.contentService
        .delete(c.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.deleting.set(false);
            if (response.success) {
              this.router.navigate(['/dashboard/medias/bibliotheque']);
            } else {
              this.error.set(response.message || 'Erreur lors de la suppression.');
            }
          },
          error: (err) => {
            console.error('❌ Erreur suppression:', err);
            this.deleting.set(false);
            this.error.set('Une erreur est survenue.');
          },
        });
    }
  }

  downloadFile(): void {
    const c = this.content();
    if (!c || !c.url) return;

    this.contentService
      .getFile(c.url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = c.title || 'fichier';
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (err) => {
          console.error('❌ Erreur téléchargement:', err);
          this.error.set('Impossible de télécharger le fichier.');
        },
      });
  }

  // ──────────────────────────────────────────────────────────────
  // HELPERS D’AFFICHAGE
  // ──────────────────────────────────────────────────────────────

  getStatusClass(isPublished: boolean): string {
    const color = this.getStatusColor(isPublished);
    return `cd-badge-${color}`;
  }

  getTypeClass(type: ContentType): string {
    const color = this.getTypeColor(type);
    return `cd-type-${color}`;
  }

  getTypeColorClass(type: ContentType): string {
    const color = this.getTypeColor(type);
    return `cd-type-icon-${color}`;
  }

  getSafeUrl(url: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }

  isVideo(type: ContentType): boolean {
    return type === ContentType.Video || type === ContentType.Sermon;
  }

  isAudio(type: ContentType): boolean {
    return type === ContentType.Audio || type === ContentType.Song;
  }

  isImage(type: ContentType): boolean {
    return type === ContentType.Image;
  }

  canEdit(): boolean {
    const c = this.content();
    return !!c && this.permissions.hasPermission('Content_Update');
  }

  canDelete(): boolean {
    const c = this.content();
    return !!c && this.permissions.hasPermission('Content_Delete');
  }

  canPublish(): boolean {
    const c = this.content();
    return !!c && this.permissions.hasPermission('Content_Publish');
  }

  canViewFile(): boolean {
    const c = this.content();
    return !!c && (this.isVideo(c.type) || this.isAudio(c.type) || this.isImage(c.type));
  }
}
