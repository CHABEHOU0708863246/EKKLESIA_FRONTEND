import { Injectable, inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

/**
 * Maintient le backend « chaud ».
 *
 * Les hébergeurs gratuits (Render) endorment l'instance après inactivité : la
 * première requête peut alors prendre 30-60 s. Ce service envoie un ping léger
 * sur `/health` :
 *  - une fois au démarrage (réveil en parallèle de l'écran de connexion) ;
 *  - puis périodiquement tant que l'application est ouverte, pour éviter que
 *    l'instance ne se rendorme pendant une démonstration.
 *
 * Best-effort : n'échoue jamais, ne bloque jamais l'UI.
 */
@Injectable({ providedIn: 'root' })
export class BackendWarmupService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);

  private readonly url = `${environment.apiUrl}/health`;
  private timer?: ReturnType<typeof setInterval>;
  private started = false;

  /** Démarre le ping de réveil + keep-alive (idempotent). */
  start(intervalMs = 4 * 60 * 1000): void {
    if (this.started || !isPlatformBrowser(this.platformId)) return;
    this.started = true;

    this.ping();
    this.timer = setInterval(() => this.ping(), intervalMs);
  }

  private ping(): void {
    // Réponse ignorée : seul le fait d'atteindre le serveur compte.
    this.http.get(this.url, { responseType: 'text' }).subscribe({
      next: () => {},
      error: () => {},
    });
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
