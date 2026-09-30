import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Gestion du thème clair / sombre :
 *  - bascule manuelle (light/dark) ou suivi de la préférence système ;
 *  - mémorisation dans le navigateur ;
 *  - application via l'attribut `data-theme` sur <html> (variables CSS).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'ekklesia_theme';
  private media?: MediaQueryList;

  readonly mode = signal<ThemeMode>('system');
  readonly isDark = signal(false);

  constructor() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const stored = localStorage.getItem(this.storageKey) as ThemeMode | null;
    this.mode.set(stored === 'light' || stored === 'dark' ? stored : 'system');

    this.media = window.matchMedia('(prefers-color-scheme: dark)');
    this.media.addEventListener?.('change', () => this.apply());
    this.apply();
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    try {
      localStorage.setItem(this.storageKey, mode);
    } catch {
      /* stockage indisponible : la préférence reste pour la session */
    }
    this.apply();
  }

  /** Bascule clair ↔ sombre. */
  toggle(): void {
    this.setMode(this.isDark() ? 'light' : 'dark');
  }

  /** Reviens au suivi de la préférence système. */
  useSystem(): void {
    this.setMode('system');
  }

  private apply(): void {
    if (typeof document === 'undefined') return;
    const prefersDark = this.media?.matches ?? false;
    const dark = this.mode() === 'dark' || (this.mode() === 'system' && prefersDark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    this.isDark.set(dark);
  }
}
