import { Injectable, computed, signal } from '@angular/core';
import { Observable, defer } from 'rxjs';
import { finalize } from 'rxjs/operators';

/**
 * Suit les envois de fichiers en cours. Une barre globale (app-upload-progress)
 * s'affiche tant qu'un envoi est actif, sur n'importe quel écran.
 */
@Injectable({ providedIn: 'root' })
export class UploadProgressService {
  private readonly count = signal(0);
  readonly active = computed(() => this.count() > 0);

  begin(): void { this.count.update((c) => c + 1); }
  end(): void { this.count.update((c) => Math.max(0, c - 1)); }

  /** Enveloppe un Observable d'upload : affiche la barre pendant l'envoi. */
  wrap<T>(source: Observable<T>): Observable<T> {
    return defer(() => {
      this.begin();
      return source.pipe(finalize(() => this.end()));
    });
  }
}
