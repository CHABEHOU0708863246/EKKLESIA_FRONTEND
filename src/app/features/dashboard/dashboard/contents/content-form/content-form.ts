// src/app/features/dashboard/dashboard/medias/content-form/content-form.component.ts

import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil, finalize } from 'rxjs';
import { Church as ChurchService } from '../../../../../core/services/Church/church';
import { Church as ChurchModel } from '../../../../../core/models/Church/church.model';
import { Site } from '../../../../../core/models/Church/site.model';
import { ContentType, ContentTypeLabels, ContentCreate, ContentUpdate } from '../../../../../core/models/Communication/content.model';
import { Contents } from '../../../../../core/services/Content/contents';

const TYPE_OPTIONS = Object.values(ContentType).map((value) => ({
  value,
  label: ContentTypeLabels[value],
}));

@Component({
  selector: 'app-content-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  templateUrl: './content-form.html',
  styleUrls: ['./content-form.scss'],
})
export class ContentForm implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private contentService = inject(Contents);
  private churchService = inject(ChurchService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // ── État ──
  isEditMode = signal(false);
  contentId: string | null = null;
  saving = signal(false);
  error = signal<string | null>(null);

  // ── Listes ──
  churches = signal<ChurchModel[]>([]);
  loadingChurches = signal(false);
  sites = signal<Site[]>([]);
  loadingSites = signal(false);

  // ── Type options ──
  readonly typeOptions = TYPE_OPTIONS;
  readonly ContentType = ContentType;

  // ── Tags ──
  tags = signal<string[]>([]);
  tagInput = signal('');

  // ── Fichiers ──
  selectedFile: File | null = null;
  selectedThumbnail: File | null = null;

  // ── Formulaire ──
  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      type: [ContentType.Other, Validators.required],
      url: [''],
      thumbnailUrl: [''],
      description: [''],
      duration: [0],
      size: [0],
      metadata: this.fb.group({
        speaker: [''],
        bibleVerse: [''],
        eventDate: [''],
        location: [''],
        series: [''],
        language: [''],
      }),
      tags: [[]],
      churchId: ['', Validators.required],
      siteId: [''],
      publishedAt: [''],
      isPublished: [false],
      isFeatured: [false],
    });
  }

  ngOnInit(): void {
    this.loadChurches();

    // Détection du mode édition
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.contentId = id;
      this.loadContent(id);
    }

    // Réactivité église → sites
    this.form.get('churchId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((churchId: string) => {
        this.form.get('siteId')?.setValue('');
        this.sites.set([]);
        if (churchId) this.loadSites(churchId);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT DES DONNÉES
  // ──────────────────────────────────────────────────────────────

  private loadChurches(): void {
    this.loadingChurches.set(true);
    this.churchService.getAllChurches().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.churches.set(response.data as any);
        }
        this.loadingChurches.set(false);
      },
      error: () => this.loadingChurches.set(false),
    });
  }

  private loadSites(churchId: string): void {
    this.loadingSites.set(true);
    this.churchService.getSitesByChurchId(churchId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.sites.set(response.data as any);
        }
        this.loadingSites.set(false);
      },
      error: () => this.loadingSites.set(false),
    });
  }

  private loadContent(id: string): void {
    this.contentService.getById(id).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.populateForm(response.data);
        } else {
          this.error.set('Impossible de charger le contenu.');
        }
      },
      error: () => this.error.set('Erreur lors du chargement.'),
    });
  }

  private populateForm(content: any): void {
    this.form.patchValue({
      title: content.title,
      type: content.type,
      url: content.url,
      thumbnailUrl: content.thumbnailUrl,
      description: content.description,
      duration: content.duration,
      size: content.size,
      metadata: {
        speaker: content.metadata?.speaker || '',
        bibleVerse: content.metadata?.bibleVerse || '',
        eventDate: content.metadata?.eventDate ? this.formatDateInput(content.metadata.eventDate) : '',
        location: content.metadata?.location || '',
        series: content.metadata?.series || '',
        language: content.metadata?.language || '',
      },
      tags: content.tags || [],
      churchId: content.churchId,
      siteId: content.siteId || '',
      publishedAt: content.publishedAt ? this.formatDateInput(content.publishedAt) : '',
      isPublished: content.isPublished || false,
      isFeatured: content.isFeatured || false,
    });

    // Restaurer les tags
    this.tags.set(content.tags || []);

    // Charger les sites pour l'église sélectionnée
    if (content.churchId) {
      this.loadSites(content.churchId);
    }
  }

  private formatDateInput(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16);
  }

  // ──────────────────────────────────────────────────────────────
  // GESTION DES TAGS
  // ──────────────────────────────────────────────────────────────

  addTag(): void {
    const value = this.tagInput().trim();
    if (value && !this.tags().includes(value)) {
      this.tags.update((t) => [...t, value]);
      this.form.patchValue({ tags: this.tags() });
      this.tagInput.set('');
    }
  }

  removeTag(tag: string): void {
    this.tags.update((t) => t.filter((item) => item !== tag));
    this.form.patchValue({ tags: this.tags() });
  }

  // ──────────────────────────────────────────────────────────────
  // GESTION DES FICHIERS
  // ──────────────────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      // Met à jour la taille et la durée (si possible)
      this.form.patchValue({ size: this.selectedFile.size });
      // Pour la durée, il faudrait analyser le fichier (ex: pour vidéo/audio)
      // On peut laisser l'utilisateur la saisir manuellement.
    }
  }

  onThumbnailSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedThumbnail = input.files[0];
    }
  }

  // ──────────────────────────────────────────────────────────────
  // VALIDATION & SOUMISSION
  // ──────────────────────────────────────────────────────────────

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Veuillez corriger les champs invalides.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const raw = this.form.value;

    const payload: ContentCreate | ContentUpdate = {
      title: raw.title.trim(),
      type: raw.type,
      url: raw.url || undefined,
      thumbnailUrl: raw.thumbnailUrl || undefined,
      description: raw.description || undefined,
      duration: raw.duration || undefined,
      size: raw.size || undefined,
      metadata: {
        speaker: raw.metadata.speaker || undefined,
        bibleVerse: raw.metadata.bibleVerse || undefined,
        eventDate: raw.metadata.eventDate || undefined,
        location: raw.metadata.location || undefined,
        series: raw.metadata.series || undefined,
        language: raw.metadata.language || undefined,
      },
      tags: this.tags(),
      churchId: raw.churchId,
      siteId: raw.siteId || undefined,
      publishedAt: raw.publishedAt || undefined,
      isPublished: raw.isPublished || false,
      isFeatured: raw.isFeatured || false,
    };

    const request$ = this.isEditMode() && this.contentId
      ? this.contentService.update(this.contentId, payload)
      : this.contentService.create(payload as ContentCreate);

    request$.pipe(
      finalize(() => this.saving.set(false)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          // Si des fichiers ont été sélectionnés, les uploader après création
          const contentId = response.data.id || this.contentId;
          if (this.selectedFile) {
            this.contentService.uploadFile(contentId!, this.selectedFile).subscribe();
          }
          if (this.selectedThumbnail) {
            this.contentService.uploadThumbnail(contentId!, this.selectedThumbnail).subscribe();
          }
          this.router.navigate(['/dashboard/medias/bibliotheque', contentId]);
        } else {
          this.error.set(response.message || 'Erreur lors de l\'enregistrement.');
        }
      },
      error: (err) => {
        console.error('❌ Erreur:', err);
        this.error.set(err?.error?.message || 'Une erreur est survenue.');
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/dashboard/medias/bibliotheque']);
  }
}
