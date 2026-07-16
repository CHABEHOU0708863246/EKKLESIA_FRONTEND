import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { Subject, distinctUntilChanged, takeUntil, debounceTime } from 'rxjs';
import { Site } from '../../../../../core/models/Church/site.model';
import { SermonMediaType, SermonMediaTypeLabels, Sermon, SermonCreate } from '../../../../../core/models/Events/sermon.model';
import { User } from '../../../../../core/models/Users/user.model';
import { Sermons } from '../../../../../core/services/Sermon/sermons';
import { Users } from '../../../../../core/services/Users/users';
import { Church } from '../../../../../core/services/Church/church';
import { Church as ChurchModel } from '../../../../../core/models/Church/church.model';

@Component({
  selector: 'app-sermon-form',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './sermon-form.html',
  styleUrl: './sermon-form.scss',
})
export class SermonForm implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  readonly mediaTypeOptions = [
    { value: SermonMediaType.Audio, label: SermonMediaTypeLabels[SermonMediaType.Audio] },
    { value: SermonMediaType.Video, label: SermonMediaTypeLabels[SermonMediaType.Video] },
    { value: SermonMediaType.Document, label: SermonMediaTypeLabels[SermonMediaType.Document] },
    { value: SermonMediaType.Link, label: SermonMediaTypeLabels[SermonMediaType.Link] },
  ];

  // ── Étapes : 1) infos du sermon  2) médias (déverrouillé après création) ──
  createdSermon = signal<Sermon | null>(null);
  saving = signal(false);
  error = signal<string | null>(null);

  // ── Listes déroulantes ──
  churches = signal<ChurchModel[]>([]);
  loadingChurches = signal(false);
  sites = signal<Site[]>([]);
  loadingSites = signal(false);

  // ── Recherche de prédicateur ──
  preachers = signal<User[]>([]);

  // ── Tags ──
  tagInput = signal('');
  tags = signal<string[]>([]);

  // ── Ajout de média ──
  mediaForm: FormGroup;
  addingMedia = signal(false);
  mediaError = signal<string | null>(null);
  selectedFile: File | null = null;

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private sermonService: Sermons,
    private churchService: Church,
    private userService: Users,
    private router: Router
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      preacherId: [''],
      preacherSearch: ['', Validators.required],
      date: ['', Validators.required],
      churchId: ['', Validators.required],
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
    this.loadChurches();

    this.form.get('churchId')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((churchId: string) => {
        this.form.get('siteId')?.setValue('');
        this.sites.set([]);
        if (churchId) this.loadSites(churchId);
      });

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

  private loadChurches(): void {
    this.loadingChurches.set(true);
    this.churchService.getAllChurches().subscribe({
      next: (response: any) => {
        const items = response?.success && response?.data ? response.data : response;
        this.churches.set(items ?? []);
        this.loadingChurches.set(false);
      },
      error: () => this.loadingChurches.set(false),
    });
  }

  private loadSites(churchId: string): void {
    this.loadingSites.set(true);
    this.churchService.getSitesByChurchId(churchId).subscribe({
      next: (response: any) => {
        const items = response?.success && response?.data ? response.data : response;
        this.sites.set(items ?? []);
        this.loadingSites.set(false);
      },
      error: () => this.loadingSites.set(false),
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
    const value = this.tagInput().trim().toLowerCase();
    if (!value) return;
    if (!this.tags().includes(value)) {
      this.tags.update((t) => [...t, value]);
    }
    this.tagInput.set('');
  }

  removeTag(tag: string): void {
    this.tags.update((t) => t.filter((x) => x !== tag));
  }

  onTagKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTag();
    }
  }

  // ───────────────────────────────────────────────────────────────
  // ÉTAPE 1 — CRÉATION DU SERMON
  // ───────────────────────────────────────────────────────────────

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

    const value = this.form.value;
    const payload: SermonCreate = {
      title: value.title.trim(),
      preacherId: value.preacherId || undefined,
      preacherName: value.preacherSearch.trim(),
      date: value.date,
      churchId: value.churchId,
      siteId: value.siteId || undefined,
      theme: value.theme || undefined,
      bibleText: value.bibleText || undefined,
      summary: value.summary || undefined,
      series: value.series || undefined,
      seriesOrder: value.seriesOrder || undefined,
      tags: this.tags(),
    };

    this.sermonService
      .create(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          // ✅ Le backend renvoie le sermon à plat, avec isSuccess (camelCase)
          if (response && response.isSuccess !== false && response.id) {
            // ✅ Passe à l'étape 2 : ajout de médias, sans quitter la page
            this.createdSermon.set(response);
          } else {
            this.error.set(response?.errorMessage || "Erreur lors de la création du sermon.");
          }
        },
        error: (err) => {
          console.error('❌ Erreur lors de la création du sermon:', err);
          this.saving.set(false);
          this.error.set(err?.error?.message || 'Une erreur est survenue.');
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // ÉTAPE 2 — AJOUT DE MÉDIAS
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
    const sermon = this.createdSermon();
    if (!sermon) return;

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
      .addMedia(sermon.id, {
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
            this.createdSermon.set(updated);
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
    const sermon = this.createdSermon();
    if (!sermon) return;

    this.sermonService
      .removeMedia(sermon.id, mediaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          if (updated && updated.isSuccess !== false) {
            this.createdSermon.set(updated);
          } else {
            this.mediaError.set(updated?.errorMessage || 'Erreur lors du retrait du média.');
          }
        },
        error: () => this.mediaError.set('Erreur lors du retrait du média.'),
      });
  }

  // ───────────────────────────────────────────────────────────────
  // FINALISATION
  // ───────────────────────────────────────────────────────────────

  get canPublish(): boolean {
    const sermon = this.createdSermon();
    return !!sermon && sermon.media.length > 0;
  }

  publishAndFinish(): void {
    const sermon = this.createdSermon();
    if (!sermon) return;

    this.sermonService
      .publish(sermon.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          if (updated && updated.isSuccess !== false) {
            this.router.navigate(['/dashboard/cultes/sermons']);
          } else {
            this.mediaError.set(updated?.errorMessage || 'Erreur lors de la publication.');
          }
        },
        error: () => this.mediaError.set('Erreur lors de la publication.'),
      });
  }

  finishAsDraft(): void {
    // ✅ Redirection vers la liste, le sermon reste en brouillon
    this.router.navigate(['/dashboard/cultes/sermons']);
  }

  cancel(): void {
    this.router.navigate(['/dashboard/cultes/sermons']);
  }
}
