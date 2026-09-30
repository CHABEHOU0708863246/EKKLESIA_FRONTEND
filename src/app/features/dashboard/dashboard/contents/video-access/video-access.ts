import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VideoAccess, VideoAccessCode } from '../../../../../core/services/Videos/video-access';
import { Notification } from '../../../../../core/services/Notification/notification';

/**
 * Squelette « Vidéo » (Lot 10) : écran simple et paramétrable.
 * Si la fonctionnalité est désactivée côté serveur, on affiche « Bientôt disponible ».
 * Le comportement final (suivi de présence, QR, statistiques) n'est PAS implémenté.
 */
@Component({
  selector: 'app-video-access',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="va-page">
      <h1>Vidéo</h1>

      @if (loading()) {
        <p class="va-muted">Chargement…</p>
      } @else if (!enabled()) {
        <div class="miav-empty">
          <i class="bx bx-video"></i>
          <strong>Bientôt disponible</strong>
          <span>La diffusion vidéo et les codes d'accès arrivent prochainement.</span>
        </div>
      } @else {
        <div class="miav-card va-form">
          <h3>Générer un code d'accès</h3>
          <div class="va-row">
            <label>Plateforme
              <select class="miav-input" [(ngModel)]="platform">
                <option value="youtube">YouTube</option>
                <option value="facebook">Facebook</option>
                <option value="vimeo">Vimeo</option>
                <option value="other">Autre</option>
              </select>
            </label>
            <label>Lien de la diffusion
              <input class="miav-input" [(ngModel)]="url" placeholder="https://…" />
            </label>
            <button class="miav-btn miav-btn--primary" (click)="generate()" [disabled]="!url">Générer</button>
          </div>
        </div>

        <div class="miav-card" style="margin-top:16px">
          <h3>Codes générés</h3>
          @if (codes().length === 0) {
            <div class="miav-empty"><i class="bx bx-key"></i><strong>Aucun code</strong><span>Générez un premier code d'accès.</span></div>
          } @else {
            <table class="va-table">
              <thead><tr><th>Code</th><th>Plateforme</th><th>Statut</th><th></th></tr></thead>
              <tbody>
                @for (c of codes(); track c.id) {
                  <tr>
                    <td><strong>{{ c.code }}</strong></td>
                    <td>{{ c.platform }}</td>
                    <td>{{ c.status }}</td>
                    <td>
                      @if (c.status === 'Active') {
                        <button class="miav-btn miav-btn--ghost" (click)="revoke(c)">Révoquer</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .va-page { padding: 24px 16px; max-width: 960px; margin: 0 auto; }
    .va-muted { color: var(--color-muted); }
    .va-form { padding: 16px; }
    .va-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; }
    .va-row label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
    .va-table { width: 100%; border-collapse: collapse; }
    .va-table th, .va-table td { text-align: left; padding: 8px; border-bottom: 1px solid var(--color-border); }
  `],
})
export class VideoAccessComponent implements OnInit {
  private service = inject(VideoAccess);
  private notification = inject(Notification);

  loading = signal(true);
  enabled = signal(false);
  codes = signal<VideoAccessCode[]>([]);
  platform = 'youtube';
  url = '';

  ngOnInit(): void {
    this.service.getState().subscribe({
      next: (res) => {
        this.loading.set(false);
        this.enabled.set(!!res?.data?.enabled);
        this.codes.set(res?.data?.items ?? []);
      },
      error: () => this.loading.set(false),
    });
  }

  generate(): void {
    this.service.generate({ platform: this.platform, url: this.url }).subscribe({
      next: () => {
        this.url = '';
        this.notification.success('Code généré', 'Le code d\'accès a été créé.');
        this.refresh();
      },
    });
  }

  revoke(code: VideoAccessCode): void {
    this.service.revoke(code.id).subscribe({ next: () => this.refresh() });
  }

  private refresh(): void {
    this.service.getState().subscribe({ next: (res) => this.codes.set(res?.data?.items ?? []) });
  }
}
