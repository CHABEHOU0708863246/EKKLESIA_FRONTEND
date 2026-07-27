// src/app/features/dashboard/dashboard/medias/live-broadcast/live-broadcast.component.ts

import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Content, ContentType } from '../../../../../core/models/Communication/content.model';
import { Permissions } from '../../../../../core/services/Permissions/permissions';
import { Contents } from '../../../../../core/services/Content/contents';

@Component({
  selector: 'app-live-broadcast',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './live-broadcast.html',
  styleUrls: ['./live-broadcast.scss'],
})
export class LiveBroadcast implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private contentService = inject(Contents);
  private router = inject(Router);
  public permissions = inject(Permissions);

  // ── État ──
  broadcast = signal<Content | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  isLive = signal(false);
  viewerCount = signal(0);

  // ── Computed ──
  hasBroadcast = computed(() => this.broadcast() !== null);
  broadcastTitle = computed(() => this.broadcast()?.title || 'Aucune diffusion en cours');
  broadcastDescription = computed(() => this.broadcast()?.description || '');
  broadcastUrl = computed(() => this.broadcast()?.url || '');
  broadcastThumbnail = computed(() => this.broadcast()?.thumbnailUrl || '');

  constructor() {
    // Simuler un compteur de viewers qui évolue
    setInterval(() => {
      if (this.isLive()) {
        this.viewerCount.update(v => v + Math.floor(Math.random() * 5) - 2);
        if (this.viewerCount() < 0) this.viewerCount.set(0);
      }
    }, 5000);
  }

  ngOnInit(): void {
    this.loadLiveBroadcast();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT DE LA DIFFUSION EN DIRECT
  // ──────────────────────────────────────────────────────────────

  private loadLiveBroadcast(): void {
    this.loading.set(true);
    this.error.set(null);

    // Récupérer les contenus de type "Vidéo" ou "Audio" qui sont publiés
    // et filtrer ceux qui ont le tag "live" (ou un champ spécifique)
    // Pour l'exemple, on prend le premier contenu de type Vidéo publié
    this.contentService
      .getAll({
        page: 1,
        pageSize: 10,
        type: ContentType.Video,
        isPublished: true,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading.set(false);

          if (response.success && response.data && response.data.items.length > 0) {
            // ✅ Prendre le premier contenu vidéo publié comme diffusion
            // (Idéalement, on aurait un champ "isLive" ou un tag spécifique)
            const broadcast = response.data.items[0];
            this.broadcast.set(broadcast);
            this.isLive.set(true);
            this.viewerCount.set(Math.floor(Math.random() * 100) + 10);
          } else {
            this.broadcast.set(null);
            this.isLive.set(false);
            // Pas d'erreur, juste pas de diffusion en cours
          }
        },
        error: (err) => {
          console.error('❌ Erreur chargement diffusion:', err);
          this.loading.set(false);
          this.error.set('Impossible de charger la diffusion en direct.');
        },
      });
  }

  // ──────────────────────────────────────────────────────────────
  // ACTIONS
  // ──────────────────────────────────────────────────────────────

  /**
   * Rafraîchit la diffusion
   */
  refresh(): void {
    this.loadLiveBroadcast();
  }

  /**
   * Redirige vers la bibliothèque pour créer une nouvelle diffusion
   */
  goToCreateBroadcast(): void {
    this.router.navigate(['/dashboard/medias/bibliotheque/new']);
  }

  /**
   * Ouvre le flux en plein écran
   */
  openFullscreen(): void {
    const player = document.querySelector('.lb-player iframe');
    if (player) {
      (player as any).requestFullscreen?.();
    }
  }

  /**
   * Partager le lien de la diffusion
   */
  shareBroadcast(): void {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: this.broadcastTitle(),
        text: `Rejoignez-nous pour la diffusion en direct : ${this.broadcastTitle()}`,
        url: url,
      }).catch(() => {});
    } else {
      // Fallback: copier le lien
      navigator.clipboard.writeText(url).then(() => {
        // Afficher un toast de confirmation
        console.log('✅ Lien copié !');
      }).catch(() => {
        console.error('❌ Impossible de copier le lien.');
      });
    }
  }

  // ──────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────

  /**
   * Extrait l'ID de la vidéo YouTube à partir de l'URL
   */
  getYouTubeId(url: string): string {
    if (!url) return '';
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    return match ? match[1] : '';
  }

  /**
   * Extrait l'ID de la vidéo Vimeo à partir de l'URL
   */
  getVimeoId(url: string): string {
    if (!url) return '';
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : '';
  }

  /**
   * Détermine le type de plateforme (youtube, vimeo, autre)
   */
  getPlatform(url: string): 'youtube' | 'vimeo' | 'other' {
    if (!url) return 'other';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('vimeo.com')) return 'vimeo';
    return 'other';
  }

  /**
   * Génère l'URL d'intégration pour le lecteur
   */
  getEmbedUrl(url: string): string {
    const platform = this.getPlatform(url);
    if (platform === 'youtube') {
      const id = this.getYouTubeId(url);
      return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    }
    if (platform === 'vimeo') {
      const id = this.getVimeoId(url);
      return `https://player.vimeo.com/video/${id}?autoplay=1`;
    }
    return url;
  }

  /**
   * Vérifie si la diffusion peut être modifiée
   */
  canManageBroadcast(): boolean {
    return this.permissions.hasPermission('Content_Update');
  }
}
