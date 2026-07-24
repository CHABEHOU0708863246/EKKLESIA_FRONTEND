// src/app/features/dashboard/services/service-form/service-form.component.ts

import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { Church as ChurchService } from '../../../../../core/services/Church/church';
import { Church as ChurchModel } from '../../../../../core/models/Church/church.model';
import { ServiceCreate, ServiceStatus, ServiceStatusLabels } from '../../../../../core/models/Events/service.model';
import { Site } from '../../../../../core/models/Church/site.model';
import { User } from '../../../../../core/models/Users/user.model';
import { Users } from '../../../../../core/services/Users/users';
import { Service } from '../../../../../core/services/Worship/service';

const STATUS_OPTIONS = Object.values(ServiceStatus).map((value) => ({
  value,
  label: ServiceStatusLabels[value],
}));

@Component({
  selector: 'app-service-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './service-form.html',
  styleUrls: ['./service-form.scss'],
})
export class ServiceForm implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  readonly statusOptions = STATUS_OPTIONS;
  readonly ServiceStatus = ServiceStatus;

  // ── État ──
  saving = signal(false);
  error = signal<string | null>(null);
  isEditMode = signal(false);
  serviceId: string | null = null;

  // ── Listes ──
  churches = signal<ChurchModel[]>([]);
  loadingChurches = signal(false);
  sites = signal<Site[]>([]);
  loadingSites = signal(false);

  // ── Prédicateurs ──
  preachers = signal<User[]>([]);
  loadingPreachers = signal(false);

  // ── Formulaire ──
  form: FormGroup;
  private selectedPhotoFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private serviceService: Service,
    private churchService: ChurchService,
    private userService: Users,
    private router: Router
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      date: ['', Validators.required],
      churchId: ['', Validators.required],
      siteId: [''],
      preacherId: [''],
      preacherSearch: [''],
      bibleText: [''],
      theme: [''],
      status: [ServiceStatus.Scheduled, Validators.required],
      notes: [''],
      attendance: this.fb.group({
        men: [0, [Validators.min(0)]],
        women: [0, [Validators.min(0)]],
        visitors: [0, [Validators.min(0)]],
        children: [0, [Validators.min(0)]],
        acceptedJesus: [0, [Validators.min(0)]],
        notAcceptedJesus: [0, [Validators.min(0)]],
        observation: [''],
        photoUrl: [''],
        visitorNames: [[]],
      }),
    });
  }

  ngOnInit(): void {
    // Détecter mode édition
    const urlSegments = this.router.url.split('/');
    if (urlSegments.includes('edit')) {
      this.isEditMode.set(true);
      const idIndex = urlSegments.indexOf('edit') - 1;
      this.serviceId = urlSegments[idIndex] || null;
      if (this.serviceId) {
        this.loadServiceData(this.serviceId);
      }
    }

    // Charger églises
    this.loadChurches();

    // Charger prédicateurs (pasteurs)
    this.loadPreachers();

    // Réactivité église → sites
    this.form.get('churchId')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((churchId: string) => {
        this.form.get('siteId')?.setValue('');
        this.sites.set([]);
        if (churchId) this.loadSites(churchId);
      });

    // Recherche prédicateur
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

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT DES DONNÉES (édition)
  // ──────────────────────────────────────────────────────────────

  private loadServiceData(id: string): void {
    this.serviceService.getById(id).subscribe({
      next: (response: any) => {
        if (response) {
          this.populateForm(response);
        } else {
          this.error.set('Impossible de charger le culte.');
        }
      },
      error: () => this.error.set('Erreur lors du chargement du culte.'),
    });
  }

  private populateForm(service: any): void {
    this.form.patchValue({
      title: service.title,
      date: this.formatDateInput(service.date),
      churchId: service.churchId,
      siteId: service.siteId || '',
      preacherId: service.preacherId || '',
      preacherSearch: service.preacherName || '',
      bibleText: service.bibleText || '',
      theme: service.theme || '',
      status: service.status || ServiceStatus.Scheduled,
      notes: service.notes || '',
      attendance: {
        men: service.attendance?.men || 0,
        women: service.attendance?.women || 0,
        visitors: service.attendance?.visitors || 0,
        children: service.attendance?.children || 0,
        acceptedJesus: service.attendance?.acceptedJesus || 0,
        notAcceptedJesus: service.attendance?.notAcceptedJesus || 0,
        observation: service.attendance?.observation || '',
        photoUrl: service.attendance?.photoUrl || '',
        visitorNames: service.attendance?.visitorNames || [],
      },
    });

    if (service.churchId) {
      this.loadSites(service.churchId);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT DES LISTES
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

  private loadPreachers(): void {
    this.userService
      .getUsers({
        page: 1,
        pageSize: 100,
        roles: ['PASTEUR_SITE', 'PASTOR_PRINCIPAL'],
      } as any)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.preachers.set(response.data.items as any);
          }
        },
        error: () => this.preachers.set([]),
      });
  }

  private searchPreachers(term: string): void {
    this.userService.getUsers({ fullName: term, page: 1, pageSize: 20 } as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const items = (response.data.items ?? []) as User[];
            // Filtrer les utilisateurs avec rôles de pasteur
            const pastorRoles = ['PASTEUR_SITE', 'PASTOR_PRINCIPAL'];
            const filtered = items.filter((u) =>
              (u.roles ?? []).some((r) => pastorRoles.includes(r))
            );
            this.preachers.set(filtered);
          } else {
            this.preachers.set([]);
          }
        },
        error: () => this.preachers.set([]),
      });
  }

  // ──────────────────────────────────────────────────────────────
  // PHOTO (upload)
  // ──────────────────────────────────────────────────────────────

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedPhotoFile = input.files[0];
      this.form.patchValue({ attendance: { photoUrl: 'uploading...' } });
      // L'upload sera fait lors de la soumission (après création du culte)
      // ou on peut uploader immédiatement.
      // Ici, on stocke le fichier pour l'envoyer après la création du culte.
      // Mais pour simplifier, on peut attendre d'avoir l'ID du culte.
      // On peut afficher un message.
      this.form.patchValue({ attendance: { photoUrl: '✅ Fichier sélectionné' } });
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

    const rawValue = this.form.value;

    // Construire le payload sans les champs obsolètes
    const payload: ServiceCreate = {
      title: rawValue.title,
      date: rawValue.date,
      churchId: rawValue.churchId,
      siteId: rawValue.siteId || undefined,
      preacherId: rawValue.preacherId || undefined,
      preacherName: rawValue.preacherSearch || undefined,
      bibleText: rawValue.bibleText || undefined,
      theme: rawValue.theme || undefined,
      status: rawValue.status || ServiceStatus.Scheduled,
      notes: rawValue.notes || undefined,
      attendance: {
        men: rawValue.attendance?.men || 0,
        women: rawValue.attendance?.women || 0,
        visitors: rawValue.attendance?.visitors || 0,
        children: rawValue.attendance?.children || 0,
        acceptedJesus: rawValue.attendance?.acceptedJesus || 0,
        notAcceptedJesus: rawValue.attendance?.notAcceptedJesus || 0,
        observation: rawValue.attendance?.observation || '',
        photoUrl: rawValue.attendance?.photoUrl || '', // sera mis à jour après upload
        visitorNames: rawValue.attendance?.visitorNames || [],
      },
    };

    const request$ = this.isEditMode() && this.serviceId
      ? this.serviceService.update(this.serviceId, payload)
      : this.serviceService.create(payload);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        this.saving.set(false);
        if (response && response.isSuccess !== false && response.id) {
          // Si une photo a été sélectionnée, on l'upload maintenant
          if (this.selectedPhotoFile) {
            this.uploadPhoto(response.id);
          } else {
            this.router.navigate(['/dashboard/cultes']);
          }
        } else {
          this.error.set(response?.errorMessage || "Erreur lors de l'enregistrement.");
        }
      },
      error: (err) => {
        console.error('❌ Erreur:', err);
        this.saving.set(false);
        this.error.set(err?.error?.errorMessage || 'Une erreur est survenue.');
      },
    });
  }

  // ──────────────────────────────────────────────────────────────
  // UPLOAD DE LA PHOTO (après création du culte)
  // ──────────────────────────────────────────────────────────────

  private uploadPhoto(serviceId: string): void {
    if (!this.selectedPhotoFile) return;

    this.serviceService.uploadPhoto(serviceId, this.selectedPhotoFile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.photoId) {
            // ✅ Maintenant on met à jour le culte avec le photoUrl
            this.serviceService.update(serviceId, { attendance: { photoUrl: response.photoId } } as any)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: () => this.router.navigate(['/dashboard/cultes']),
                error: () => this.router.navigate(['/dashboard/cultes']),
              });
          } else {
            // Échec de l'upload, on navigue quand même
            this.router.navigate(['/dashboard/cultes']);
          }
        },
        error: () => this.router.navigate(['/dashboard/cultes']),
      });
  }

  // ──────────────────────────────────────────────────────────────
  // UTILITAIRES
  // ──────────────────────────────────────────────────────────────

  private formatDateInput(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16);
  }

  getUserFullName(user: User): string {
    return user.fullName || `${user.firstName} ${user.lastName}`.trim();
  }

  selectPreacher(user: User): void {
    this.form.patchValue({
      preacherId: user.id,
      preacherSearch: this.getUserFullName(user),
    });
    this.preachers.set([]);
  }

  clearPreacher(): void {
    this.form.patchValue({ preacherId: '', preacherSearch: '' });
  }

  cancel(): void {
    this.router.navigate(['/dashboard/cultes']);
  }
}
