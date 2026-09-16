import {
  Directive,
  ElementRef,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  PLATFORM_ID,
  SimpleChanges,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * ⚠️ Le backend exige désormais un token sur toutes les photos
 * (`/User/photo/*`, `/Member/photo/*`, `/Offering/photos/*`, `/Service/photos/*`,
 * `/Content/files/*`). Une balise `<img src="…">` du navigateur n'envoie JAMAIS
 * l'en-tête `Authorization` → réponse 401 et image cassée.
 *
 * Cette directive remplace `[src]` pour ces images : elle télécharge le binaire
 * via `HttpClient` (donc AVEC l'intercepteur JWT), puis l'expose à la balise via
 * un object URL révoqué au changement ou à la destruction du composant.
 *
 * Utilisation :
 *   <img [appAuthImage]="memberPhotoUrl" alt="…">
 *
 * Les URLs qui ne pointent pas vers l'API (assets locaux, data:, blob:, URLs
 * externes) sont posées directement dans `src`, sans requête supplémentaire.
 */
@Directive({
  selector: 'img[appAuthImage]',
  standalone: true,
})
export class AuthImageDirective implements OnChanges, OnDestroy {
  /** URL (ou identifiant transformé en URL) de l'image à charger. */
  @Input('appAuthImage') source: string | null | undefined = '';

  /** Image de repli (asset local) si le chargement authentifié échoue. */
  @Input() appAuthImageFallback: string | null = null;

  private objectUrl: string | null = null;
  private currentSource: string | null = null;
  private readonly isBrowser: boolean;

  constructor(
    private readonly el: ElementRef<HTMLImageElement>,
    private readonly http: HttpClient,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['source']) {
      this.load(this.source);
    }
  }

  ngOnDestroy(): void {
    this.releaseObjectUrl();
  }

  private load(source: string | null | undefined): void {
    if (!this.isBrowser) return;

    // Toute nouvelle source invalide le téléchargement précédent.
    this.releaseObjectUrl();
    this.currentSource = source?.trim() || null;

    if (!this.currentSource) {
      this.setSrc(this.appAuthImageFallback ?? '');
      return;
    }

    if (!this.requiresAuthenticatedFetch(this.currentSource)) {
      this.setSrc(this.currentSource);
      return;
    }

    const requested = this.currentSource;
    this.http.get(requested, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        // Réponse obsolète : la source a changé entre-temps.
        if (this.currentSource !== requested) return;
        this.objectUrl = URL.createObjectURL(blob);
        this.setSrc(this.objectUrl);
      },
      error: () => {
        if (this.currentSource !== requested) return;
        this.setSrc(this.appAuthImageFallback ?? '');
      },
    });
  }

  /**
   * Seules les URLs absolues pointant vers l'API exigent le token.
   * Tout le reste (assets locaux, data:, blob:, CDN externe) reste direct.
   */
  private requiresAuthenticatedFetch(url: string): boolean {
    if (/^(data:|blob:)/i.test(url)) return false;
    if (/^https?:\/\//i.test(url)) {
      const apiUrl = environment.apiUrl?.replace(/\/+$/, '') ?? '';
      return apiUrl.length > 0 && url.startsWith(apiUrl);
    }
    return false;
  }

  private setSrc(value: string): void {
    const img = this.el.nativeElement;
    if (value) {
      img.setAttribute('src', value);
    } else {
      img.removeAttribute('src');
    }
  }

  private releaseObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
