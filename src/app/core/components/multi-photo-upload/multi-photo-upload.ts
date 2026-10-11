// src/app/core/components/multi-photo-upload/multi-photo-upload.ts
import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  inject,
  signal,
} from '@angular/core';

import { IMAGE_LIMITS, formatBytes } from '../../utils/image-tools';
import { NativeCameraService } from '../../services/Native/native-camera.service';
import { PlatformService } from '../../services/Native/platform.service';
import { AuthImageDirective } from '../../directives/auth-image.directive';

/** Limites RG-PHOTO : JPEG/PNG/WEBP, 5 Mo par photo. */
const MAX_BYTES = 5 * 1024 * 1024;

interface PhotoItem {
  id: number;
  file: File;
  url: string;
}

/**
 * Sélecteur MULTI-PHOTOS réutilisable (cultes & offrandes).
 * - glisser-déposer ou bouton (+ caméra/galerie sur natif) ;
 * - 1 à 5 photos ; JPEG/PNG/WEBP ; 5 Mo max par photo ;
 * - vignettes avec suppression individuelle ;
 * - compteur dynamique « n/5 ».
 * RG-PHOTO.
 */
@Component({
  selector: 'app-multi-photo-upload',
  standalone: true,
  imports: [CommonModule, AuthImageDirective],
  templateUrl: './multi-photo-upload.html',
  styleUrl: './multi-photo-upload.scss',
})
export class MultiPhotoUpload implements OnDestroy {
  private readonly camera = inject(NativeCameraService);
  private readonly platform = inject(PlatformService);

  @Input() label = 'Photos justificatives';
  @Input() hint = '';
  @Input() minCount = 1;
  @Input() maxCount = 5;
  @Input() disabled = false;
  /** Identifiants des photos déjà enregistrées (édition). */
  @Input() existingPhotoIds: string[] = [];
  /** Fonction de résolution d'URL pour les photos existantes. */
  @Input() resolveUrl: (id: string) => string = (id) => id;

  /** Émet la liste des fichiers sélectionnés à chaque changement. */
  @Output() filesChange = new EventEmitter<File[]>();
  /** Émet l'id d'une photo existante retirée (à supprimer au moment voulu). */
  @Output() existingRemoved = new EventEmitter<string>();

  readonly maxBytes = MAX_BYTES;
  readonly allowedTypes = IMAGE_LIMITS.allowedTypes;
  readonly isNative = this.platform.isNative;

  photos = signal<PhotoItem[]>([]);
  removedExisting = signal<string[]>([]);
  error = signal<string>('');
  dragActive = signal(false);

  private nextId = 1;

  get count(): number {
    return this.photos().length;
  }

  /** Nombre affiché : sélectionnées + existantes encore présentes. */
  get retainedExisting(): string[] {
    const removed = new Set(this.removedExisting());
    return (this.existingPhotoIds ?? []).filter((id) => !removed.has(id));
  }

  get totalCount(): number {
    return this.count + this.retainedExisting.length;
  }

  get counterLabel(): string {
    return `${this.totalCount}/${this.maxCount} photo${this.totalCount > 1 ? 's' : ''}`;
  }

  get canAdd(): boolean {
    return !this.disabled && this.totalCount < this.maxCount;
  }

  get selectedFiles(): File[] {
    return this.photos().map((p) => p.file);
  }

  // ───────────────────────────────────────────────────────────────
  // SÉLECTION
  // ───────────────────────────────────────────────────────────────

  onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.accept(Array.from(input.files ?? []));
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    if (!this.canAdd) return;
    event.preventDefault();
    this.dragActive.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
    if (!this.canAdd) return;
    this.accept(Array.from(event.dataTransfer?.files ?? []));
  }

  async pickFromCamera(): Promise<void> {
    if (!this.canAdd) return;
    const file = await this.camera.pickImage('camera');
    if (file) this.accept([file]);
  }

  async pickFromGallery(): Promise<void> {
    if (!this.canAdd) return;
    const file = await this.camera.pickImage('gallery');
    if (file) this.accept([file]);
  }

  private accept(files: File[]): void {
    if (!files.length) return;
    this.error.set('');

    const room = this.maxCount - this.totalCount;
    if (room <= 0) {
      this.error.set(`Maximum ${this.maxCount} photos.`);
      return;
    }

    let candidates = files;
    if (files.length > room) {
      candidates = files.slice(0, room);
      this.error.set(`Seules les ${room} premières photos ont été ajoutées (maximum ${this.maxCount}).`);
    }

    const accepted: PhotoItem[] = [];
    for (const file of candidates) {
      const verdict = this.validate(file);
      if (!verdict) continue;
      accepted.push({ id: this.nextId++, file, url: URL.createObjectURL(file) });
    }

    if (!accepted.length) return;

    this.photos.update((list) => [...list, ...accepted]);
    this.emit();
  }

  private validate(file: File): boolean {
    if (!this.allowedTypes.includes(file.type as any)) {
      this.error.set(`« ${file.name} » : format non autorisé. Utilisez JPEG, PNG ou WEBP.`);
      return false;
    }
    if (file.size > MAX_BYTES) {
      this.error.set(`« ${file.name} » trop lourde (${formatBytes(file.size)}). Maximum ${formatBytes(MAX_BYTES)} par photo.`);
      return false;
    }
    return true;
  }

  // ───────────────────────────────────────────────────────────────
  // SUPPRESSION
  // ───────────────────────────────────────────────────────────────

  removeAt(index: number): void {
    const photo = this.photos()[index];
    if (photo) URL.revokeObjectURL(photo.url);
    this.photos.update((list) => list.filter((_, i) => i !== index));
    this.emit();
  }

  removeExisting(id: string): void {
    this.removedExisting.update((list) => [...list, id]);
    this.existingRemoved.emit(id);
  }

  /** Validé si le nombre total respecte [minCount, maxCount]. */
  isValid(): boolean {
    return this.totalCount >= this.minCount && this.totalCount <= this.maxCount;
  }

  /** Message d'erreur de nombre (à afficher par le parent au submit). */
  countError(): string | null {
    if (this.totalCount < this.minCount) {
      return this.minCount === 1
        ? 'Au moins une photo justificative est obligatoire.'
        : `Au moins ${this.minCount} photos sont obligatoires.`;
    }
    return null;
  }

  private emit(): void {
    this.filesChange.emit(this.selectedFiles);
  }

  ngOnDestroy(): void {
    for (const p of this.photos()) URL.revokeObjectURL(p.url);
  }
}
