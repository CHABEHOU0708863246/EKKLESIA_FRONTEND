import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { IMAGE_FILE_LIMITS, FileValidationLimits, validateFile } from '../../utils/file-validation';
import { UploadProgressService } from '../../services/Uploads/upload-progress.service';

/**
 * Champ d'upload réutilisable (photos, pièces jointes).
 * - valide le type et la taille AVANT envoi (message distinct : type / taille) ;
 * - affiche un aperçu et le nom du fichier ;
 * - affiche la barre de progression globale pendant l'envoi ;
 * - émet le fichier au parent, qui gère l'appel réseau (donc aussi l'erreur réseau).
 * (RG-P0-6)
 */
@Component({
  selector: 'app-upload-field',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="uf-upload" [class.uf-upload--disabled]="disabled">
      @if (label) { <label class="uf-upload__label">{{ label }}</label> }

      <div class="uf-upload__row">
        <button type="button" class="uf-upload__btn" [disabled]="disabled" (click)="input.click()">
          <i class="bx bx-cloud-upload"></i> Choisir un fichier
        </button>
        @if (fileName()) { <span class="uf-upload__name">{{ fileName() }}</span> }
      </div>

      <input #input type="file" hidden [attr.accept]="accept" (change)="onChange($event)" />

      @if (hint) { <p class="uf-upload__hint">{{ hint }}</p> }

      @if (progress.active()) {
        <div class="uf-upload__progress" aria-live="polite">
          <span class="uf-upload__spinner"></span> Envoi en cours…
        </div>
      }

      @if (error()) {
        <p class="uf-upload__error" role="alert"><i class="bx bx-error-circle"></i> {{ error() }}</p>
      }

      @if (localPreview() || previewUrl) {
        <div class="uf-upload__preview">
          <img [src]="localPreview() || previewUrl" alt="Aperçu du fichier" />
          <button type="button" class="uf-upload__remove" (click)="clear()" aria-label="Retirer le fichier">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .uf-upload { margin: 0; }
    .uf-upload__label { display: block; font-weight: 600; margin-bottom: 6px; }
    .uf-upload__row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .uf-upload__btn {
      display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
      background: #6c5ce7; color: #fff; border: none; border-radius: 10px;
      padding: 9px 14px; font-weight: 600; font-size: 14px;
    }
    .uf-upload__btn i { font-size: 18px; }
    .uf-upload__btn:disabled { opacity: .55; cursor: not-allowed; }
    .uf-upload__name { font-size: 13px; color: #475569; }
    .uf-upload__hint { margin: 6px 0 0; font-size: 12.5px; color: #64748b; }
    .uf-upload__progress { display: flex; align-items: center; gap: 8px; margin-top: 8px; color: #6c5ce7; font-weight: 600; font-size: 13px; }
    .uf-upload__spinner {
      width: 14px; height: 14px; border: 2px solid rgba(108,92,231,.35);
      border-top-color: #6c5ce7; border-radius: 50%; animation: uf-spin .8s linear infinite;
    }
    @keyframes uf-spin { to { transform: rotate(360deg); } }
    .uf-upload__error { margin: 8px 0 0; color: #e04646; font-size: 13px; display: flex; align-items: center; gap: 6px; }
    .uf-upload__preview { position: relative; margin-top: 10px; width: fit-content; }
    .uf-upload__preview img { max-width: 220px; max-height: 160px; border-radius: 10px; border: 1px solid #e8eaf1; display: block; }
    .uf-upload__remove {
      position: absolute; top: -8px; right: -8px; width: 24px; height: 24px;
      border-radius: 50%; border: none; background: #e04646; color: #fff; cursor: pointer; font-size: 12px;
    }
  `],
})
export class UploadField {
  progress = inject(UploadProgressService);

  @Input() label = '';
  @Input() hint = '';
  @Input() accept = 'image/jpeg,image/png,image/webp';
  @Input() limits: FileValidationLimits = IMAGE_FILE_LIMITS;
  @Input() disabled = false;
  /** URL existante (déjà enregistrée) à prévisualiser. */
  @Input() previewUrl: string | null = null;

  @Output() fileSelected = new EventEmitter<File>();
  @Output() cleared = new EventEmitter<void>();

  localPreview = signal<string | null>(null);
  fileName = signal<string>('');
  error = signal<string>('');

  onChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = ''; // permet de rechoisir le même fichier
    if (!file) return;

    const verdict = validateFile(file, this.limits);
    if (!verdict.ok) {
      this.error.set(verdict.message ?? 'Fichier refusé.');
      return;
    }

    this.error.set('');
    this.fileName.set(file.name);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => this.localPreview.set(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      this.localPreview.set(null);
    }
    this.fileSelected.emit(file);
  }

  clear(): void {
    this.error.set('');
    this.fileName.set('');
    this.localPreview.set(null);
    this.cleared.emit();
  }

  /** Appelé par le parent en cas d'échec réseau/API. */
  setError(message: string): void { this.error.set(message); }
}
