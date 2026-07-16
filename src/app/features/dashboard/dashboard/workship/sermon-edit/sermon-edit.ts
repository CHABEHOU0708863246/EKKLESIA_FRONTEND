// src/app/features/dashboard/services/sermon-edit/sermon-edit.ts
import { Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { Church as ChurchService } from '../../../../../core/services/Church/church';
import { Church as ChurchModel } from '../../../../../core/models/Church/church.model';
import { Site } from '../../../../../core/models/Church/site.model';
import { User } from '../../../../../core/models/Users/user.model';
import { Users } from '../../../../../core/services/Users/users';
import {
  Sermon,
  SermonUpdate,
  SermonStatus,
  SermonStatusLabels,
  SermonMediaType,
  SermonMediaTypeLabels,
  SermonUtils,
} from '../../../../../core/models/Events/sermon.model';
import { Sermons } from '../../../../../core/services/Sermon/sermons';

@Component({
  selector: 'app-sermon-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './sermon-edit.html',
  styleUrl: './sermon-edit.scss',
})
export class SermonEdit implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private sermonId = '';

  readonly SermonStatus = SermonStatus;
  readonly mediaTypeOptions = [
    { value: SermonMediaType.Audio, label: SermonMediaTypeLabels[SermonMediaType.Audio] },
    { value: SermonMediaType.Video, label: SermonMediaTypeLabels[SermonMediaType.Video] },
    { value: SermonMediaType.Document, label: SermonMediaTypeLabels[SermonMediaType.Document] },
    { value: SermonMediaType.Link, label: SermonMediaTypeLabels[SermonMediaType.Link] },
  ];

  sermon = signal<Sermon | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  saving = signal(false);
  saveSuccess = signal(false);

  // ── Actions de cycle de vie ──
  publishing = signal(false);
  archiving = signal(false);
  unarchiving = signal(false);

  // ── Listes déroulantes ──
  churches = signal<ChurchModel[]>([]);
  sites = signal<Site[]>([]);
  preachers = signal<User[]>([]);

  // ── Tags ──
  tagInput = signal('');
  tags = signal<string[]>([]);

  // ── Médias ──
  mediaForm: FormGroup;
  addingMedia = signal(false);
  mediaError = signal<string | null>(null);
  removingMediaId = signal<string | null>(null);
  selectedFile: File | null = null;

  form: FormGroup;

  // ── Règles de gestion dérivées de l'état du sermon ──
  isArchived = computed(() => this.sermon()?.status === SermonStatus.Archived);
  isPublished = computed(() => this.sermon()?.status === SermonStatus.Published);
  isDraft = computed(() => this.sermon()?.status === SermonStatus.Draft);
  canEdit = computed(() => !this.isArchived());
  canPublish = computed(() => {
    const s = this.sermon();
    return !!s && s.status === SermonStatus.Draft && s.media.length > 0;
  });
  canArchive = computed(() => this.isPublished());
  // ⚠️ Le backend n'a pas d'endpoint "unpublish" ni "unarchive" — un sermon
  // archivé est un état terminal. On l'affiche mais on ne prétend pas pouvoir
  // en sortir tant que ce n'est pas ajouté côté backend.

  constructor(
    private fb: FormBuilder,
    private sermonService: Sermons,
    private churchService: ChurchService,
    private userService: Users,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      preacherId: [''],
      preacherSearch: ['', Validators.required],
      date: ['', Validators.required],
      siteId: [''],
      theme: [''],
      bibleText: [''],
      summary: [''],
      series: [''],
      seriesOrder: [null],
    });

    this.mediaForm = this.fb.group({
      type: [SermonMediaType.Audio, Validators.required],
      label: [''],
      externalUrl: [''],
      durationSeconds: [null],
    });
  }

  ngOnInit(): void {
    this.sermonId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.sermonId) {
      this.error.set('Identifiant de sermon invalide.');
      this.loading.set(false);
      return;
    }

    this.loadChurches();
    this.loadSermon();

    this.form.get('preacherSearch')?.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term: string) => {
        if (term && term.trim().length >= 2) {
          this.searchPreachers(term.trim());
        } else {
          this.preachers.set([]);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT
  // ───────────────────────────────────────────────────────────────

  private loadSermon(): void {
    this.loading.set(true);
    this.error.set(null);

    this.sermonService
      .getById(this.sermonId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response) {
            this.sermon.set(response);
            this.populateForm(response);
            if (response.churchId) {
              this.loadSites(response.churchId);
            }
          } else {
            this.error.set('Sermon introuvable.');
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error('❌ Erreur lors du chargement du sermon:', err);
          this.error.set('Impossible de charger ce sermon.');
          this.loading.set(false);
        },
      });
  }

  private populateForm(sermon: Sermon): void {
    this.form.patchValue({
      title: sermon.title,
      preacherId: sermon.preacherId || '',
      preacherSearch: sermon.preacherName,
      date: this.toDateInputValue(sermon.date),
      siteId: sermon.siteId || '',
      theme: sermon.theme || '',
      bibleText: sermon.bibleText || '',
      summary: sermon.summary || '',
      series: sermon.series || '',
      seriesOrder: sermon.seriesOrder ?? null,
    }, { emitEvent: false });

    this.tags.set([...sermon.tags]);

    // ✅ Un sermon archivé n'est plus modifiable — verrouillage du formulaire
    if (sermon.status === SermonStatus.Archived) {
      this.form.disable({ emitEvent: false });
    }
  }

  private toDateInputValue(date: string): string {
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  private loadChurches(): void {
    this.churchService.getAllChurches().subscribe({
      next: (response: any) => {
        const items = response?.success && response?.data ? response.data : response;
        this.churches.set(items ?? []);
      },
      error: () => this.churches.set([]),
    });
  }

  private loadSites(churchId: string): void {
    this.churchService.getSitesByChurchId(churchId).subscribe({
      next: (response: any) => {
        const items = response?.success && response?.data ? response.data : response;
        this.sites.set(items ?? []);
      },
      error: () => this.sites.set([]),
    });
  }

  private searchPreachers(term: string): void {
    this.userService.getUsers({ fullName: term, page: 1, pageSize: 20 } as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const data = response?.success && response?.data ? response.data : response;
          this.preachers.set(data?.items ?? []);
        },
        error: () => this.preachers.set([]),
      });
  }

  selectPreacher(user: User): void {
    const fullName = user.fullName || `${user.firstName} ${user.lastName}`.trim();
    this.form.patchValue({
      preacherId: user.id,
      preacherSearch: fullName,
    });
    this.preachers.set([]);
  }

  // ───────────────────────────────────────────────────────────────
  // TAGS
  // ───────────────────────────────────────────────────────────────

  addTag(): void {
    if (!this.canEdit()) return;
    const value = this.tagInput().trim().toLowerCase();
    if (!value) return;
    if (!this.tags().includes(value)) {
      this.tags.update((t) => [...t, value]);
    }
    this.tagInput.set('');
  }

  removeTag(tag: string): void {
    if (!this.canEdit()) return;
    this.tags.update((t) => t.filter((x) => x !== tag));
  }

  onTagKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTag();
    }
  }

  // ───────────────────────────────────────────────────────────────
  // SAUVEGARDE DES INFORMATIONS
  // ───────────────────────────────────────────────────────────────

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  save(): void {
    if (!this.canEdit()) {
      this.error.set('Ce sermon est archivé et ne peut plus être modifié.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Veuillez corriger les champs invalides.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.saveSuccess.set(false);

    const value = this.form.value;
    const payload: SermonUpdate = {
      title: value.title.trim(),
      preacherId: value.preacherId || undefined,
      preacherName: value.preacherSearch.trim(),
      date: value.date,
      siteId: value.siteId || undefined,
      theme: value.theme || undefined,
      bibleText: value.bibleText || undefined,
      summary: value.summary || undefined,
      series: value.series || undefined,
      seriesOrder: value.seriesOrder || undefined,
      tags: this.tags(),
    };

    this.sermonService
      .update(this.sermonId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          // ✅ Réponse à plat : isSuccess directement sur l'objet
          if (response && response.isSuccess !== false) {
            this.sermon.set(response);
            this.saveSuccess.set(true);
            setTimeout(() => this.saveSuccess.set(false), 3000);
          } else {
            this.error.set(response?.errorMessage || 'Erreur lors de la mise à jour.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur lors de la mise à jour:', err);
          this.saving.set(false);
          this.error.set(err?.error?.message || 'Une erreur est survenue.');
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // CYCLE DE VIE — PUBLICATION / ARCHIVAGE
  // ───────────────────────────────────────────────────────────────

  publish(): void {
    if (!this.canPublish()) {
      this.error.set("Ce sermon n'a pas encore de média associé. Ajoutez-en un avant de publier.");
      return;
    }

    this.publishing.set(true);
    this.error.set(null);

    this.sermonService
      .publish(this.sermonId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.publishing.set(false);
          if (response && response.isSuccess !== false) {
            this.sermon.set(response);
          } else {
            this.error.set(response?.errorMessage || 'Erreur lors de la publication.');
          }
        },
        error: (err) => {
          this.publishing.set(false);
          this.error.set(err?.error?.message || 'Erreur lors de la publication.');
        },
      });
  }

  archive(): void {
    if (!this.canArchive()) return;
    if (!confirm('Archiver ce sermon ? Il ne sera plus visible dans la bibliothèque publique et ne pourra plus être modifié.')) {
      return;
    }

    this.archiving.set(true);
    this.error.set(null);

    this.sermonService
      .archive(this.sermonId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.archiving.set(false);
          if (response && response.isSuccess !== false) {
            this.sermon.set(response);
            this.form.disable(); // ✅ verrouille le formulaire une fois archivé
          } else {
            this.error.set(response?.errorMessage || "Erreur lors de l'archivage.");
          }
        },
        error: (err) => {
          this.archiving.set(false);
          this.error.set(err?.error?.message || "Erreur lors de l'archivage.");
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // MÉDIAS
  // ───────────────────────────────────────────────────────────────

  get selectedMediaType(): SermonMediaType {
    return this.mediaForm.get('type')?.value;
  }

  get requiresFile(): boolean {
    return this.selectedMediaType === SermonMediaType.Audio
      || this.selectedMediaType === SermonMediaType.Document;
  }

  get requiresUrl(): boolean {
    return this.selectedMediaType === SermonMediaType.Video
      || this.selectedMediaType === SermonMediaType.Link;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const maxSize = this.selectedMediaType === SermonMediaType.Audio
      ? 50 * 1024 * 1024
      : 15 * 1024 * 1024;

    if (file.size > maxSize) {
      this.mediaError.set(`Le fichier dépasse la taille maximale autorisée (${maxSize / (1024 * 1024)} Mo).`);
      return;
    }

    this.selectedFile = file;
    this.mediaError.set(null);
  }

  addMedia(): void {
    if (!this.canEdit()) {
      this.mediaError.set('Ce sermon est archivé, impossible d\'ajouter un média.');
      return;
    }

    if (this.mediaForm.invalid) {
      this.mediaError.set('Veuillez renseigner les champs requis.');
      return;
    }

    if (this.requiresFile && !this.selectedFile) {
      this.mediaError.set('Veuillez sélectionner un fichier.');
      return;
    }

    const value = this.mediaForm.value;
    if (this.requiresUrl && !value.externalUrl) {
      this.mediaError.set('Veuillez renseigner une URL.');
      return;
    }

    this.addingMedia.set(true);
    this.mediaError.set(null);

    this.sermonService
      .addMedia(this.sermonId, {
        type: value.type,
        label: value.label || undefined,
        externalUrl: value.externalUrl || undefined,
        file: this.selectedFile || undefined,
        durationSeconds: value.durationSeconds || undefined,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.addingMedia.set(false);
          if (updated && updated.isSuccess !== false) {
            this.sermon.set(updated);
            this.mediaForm.reset({ type: SermonMediaType.Audio, label: '', externalUrl: '', durationSeconds: null });
            this.selectedFile = null;
          } else {
            this.mediaError.set(updated?.errorMessage || "Erreur lors de l'ajout du média.");
          }
        },
        error: (err) => {
          console.error('❌ Erreur ajout média:', err);
          this.addingMedia.set(false);
          this.mediaError.set(err?.error?.message || "Erreur lors de l'ajout du média.");
        },
      });
  }

  removeMedia(mediaId: string): void {
    const sermon = this.sermon();
    if (!sermon) return;

    // ── Règle : impossible de retirer le dernier média d'un sermon publié ──
    if (sermon.status === SermonStatus.Published && sermon.media.length === 1) {
      this.mediaError.set(
        "Impossible de retirer le dernier média d'un sermon publié. " +
        "Ajoutez d'abord un autre média, ou contactez un administrateur pour dépublier ce sermon."
      );
      return;
    }

    if (!confirm('Retirer ce média du sermon ?')) return;

    this.removingMediaId.set(mediaId);
    this.mediaError.set(null);

    this.sermonService
      .removeMedia(this.sermonId, mediaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.removingMediaId.set(null);
          if (updated && updated.isSuccess !== false) {
            this.sermon.set(updated);
          } else {
            this.mediaError.set(updated?.errorMessage || 'Erreur lors du retrait du média.');
          }
        },
        error: (err) => {
          this.removingMediaId.set(null);
          this.mediaError.set(err?.error?.message || 'Erreur lors du retrait du média.');
        },
      });
  }

  playMedia(fileId: string): void {
    window.open(this.sermonService.getMediaDownloadUrl(this.sermonId, fileId), '_blank');
  }

  // ───────────────────────────────────────────────────────────────
  // NAVIGATION
  // ───────────────────────────────────────────────────────────────

  goBack(): void {
    this.router.navigate(['/dashboard/cultes/sermons']);
  }

  // ───────────────────────────────────────────────────────────────
  // HELPERS D'AFFICHAGE
  // ───────────────────────────────────────────────────────────────

  getStatusLabel(status: SermonStatus): string {
    return SermonUtils.getStatusLabel(status);
  }

  getStatusColor(status: SermonStatus): string {
    return SermonUtils.getStatusColor(status);
  }

  formatDuration(seconds?: number): string {
    return SermonUtils.formatDuration(seconds);
  }
}
