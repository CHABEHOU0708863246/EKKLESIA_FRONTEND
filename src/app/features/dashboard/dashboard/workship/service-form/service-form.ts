// src/app/features/dashboard/services/service-form/service-form.component.ts

import { Component, computed, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, distinctUntilChanged, takeUntil } from 'rxjs';
import { Church as ChurchService } from '../../../../../core/services/Church/church';
import { Church as ChurchModel } from '../../../../../core/models/Church/church.model';
import {
  ServiceAttendance,
  ServiceCreate,
  ServiceStatus,
  ServiceStatusLabels,
  ServiceUpdate,
} from '../../../../../core/models/Events/service.model';
import { Site } from '../../../../../core/models/Church/site.model';
import { User } from '../../../../../core/models/Users/user.model';
import { Users } from '../../../../../core/services/Users/users';
import { Service } from '../../../../../core/services/Worship/service';

const STATUS_OPTIONS = Object.values(ServiceStatus).map((value) => ({
  value,
  label: ServiceStatusLabels[value],
}));

type PreacherMode = 'internal' | 'external';

// ──────────────────────────────────────────────────────────────
// HELPERS RÔLES
// Le backend peut renvoyer les rôles sous plusieurs formes :
//   - codes techniques : 'PASTOR_PRINCIPAL', 'PASTEUR_SITE'
//   - libellés         : 'Pasteur Principal', 'Pasteur de Site'
//   - objets           : { id, name } / { code, label }
// On normalise tout avant comparaison.
// ──────────────────────────────────────────────────────────────

/** Majuscules, sans accents, sans séparateurs. 'Pasteur de Site' → 'PASTEURDESITE' */
function normalizeRole(value: unknown): string {
  if (!value) return '';
  const raw =
    typeof value === 'string'
      ? value
      : ((value as any).name ??
         (value as any).roleName ??
         (value as any).code ??
         (value as any).label ??
         '');
  return String(raw)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

/** Rassemble tous les champs de rôle possibles renvoyés par l'API */
function extractRoles(user: any): string[] {
  return [user?.roles, user?.roleNames, user?.primaryRole]
    .flatMap((bucket) => (Array.isArray(bucket) ? bucket : bucket ? [bucket] : []))
    .map(normalizeRole)
    .filter(Boolean);
}

/** Un pasteur = tout rôle contenant PASTOR ou PASTEUR (exclut Super Administrateur) */
function isPastor(user: any): boolean {
  return extractRoles(user).some((r) => r.includes('PASTOR') || r.includes('PASTEUR'));
}

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
  allPreachers = signal<User[]>([]);
  loadingPreachers = signal(false);
  preacherFilter = signal('');

  /** Liste filtrée côté client (nom, email, rôle) */
  filteredPreachers = computed(() => {
    const term = this.preacherFilter().trim().toLowerCase();
    const list = this.allPreachers();
    if (!term) return list;
    return list.filter((u) => {
      const name = this.getUserFullName(u).toLowerCase();
      const email = (u.email ?? '').toLowerCase();
      const role = this.getPreacherRoleLabel(u).toLowerCase();
      return name.includes(term) || email.includes(term) || role.includes(term);
    });
  });

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

      // ── Prédicateur ──
      preacherMode: ['internal' as PreacherMode, Validators.required],
      preacherId: [''],
      preacherName: [''],

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
    const urlSegments = this.router.url.split('/');
    if (urlSegments.includes('edit')) {
      this.isEditMode.set(true);
      const idIndex = urlSegments.indexOf('edit') - 1;
      this.serviceId = urlSegments[idIndex] || null;
      if (this.serviceId) {
        this.loadServiceData(this.serviceId);
      }
    }

    this.loadChurches();
    this.loadPreachers();

    this.form.get('churchId')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((churchId: string) => {
        this.form.get('siteId')?.setValue('');
        this.sites.set([]);
        if (churchId) this.loadSites(churchId);
      });

    this.form.get('preacherMode')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((mode: PreacherMode) => this.applyPreacherMode(mode, true));

    this.applyPreacherMode('internal', false);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ──────────────────────────────────────────────────────────────
  // PRÉDICATEUR
  // ──────────────────────────────────────────────────────────────

  private applyPreacherMode(mode: PreacherMode, reset: boolean): void {
    const idCtrl = this.form.get('preacherId');
    const nameCtrl = this.form.get('preacherName');
    if (!idCtrl || !nameCtrl) return;

    if (mode === 'external') {
      if (reset) idCtrl.setValue('', { emitEvent: false });
      idCtrl.clearValidators();
      nameCtrl.setValidators([Validators.required, Validators.minLength(3)]);
    } else {
      if (reset) nameCtrl.setValue('', { emitEvent: false });
      idCtrl.setValidators([Validators.required]);
      nameCtrl.clearValidators();
    }
    idCtrl.updateValueAndValidity({ emitEvent: false });
    nameCtrl.updateValueAndValidity({ emitEvent: false });
  }

  onPreacherFilterInput(event: Event): void {
    this.preacherFilter.set((event.target as HTMLInputElement).value ?? '');
  }

  get isExternalPreacher(): boolean {
    return this.form.get('preacherMode')?.value === 'external';
  }

  getPreacherRoleLabel(user: User): string {
    const roles = extractRoles(user);
    if (roles.some((r) => r.includes('PRINCIPAL'))) return 'Pasteur principal';
    if (roles.some((r) => r.includes('SITE'))) return 'Pasteur de site';
    return 'Pasteur';
  }

  /** Nom du pasteur sélectionné, pour l'envoi au backend */
  private resolvePreacherName(preacherId: string): string {
    const found = this.allPreachers().find((u) => u.id === preacherId);
    return found ? this.getUserFullName(found) : '';
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
    const hasInternalPreacher = !!service.preacherId;
    const mode: PreacherMode = hasInternalPreacher
      ? 'internal'
      : service.preacherName
        ? 'external'
        : 'internal';

    this.form.patchValue({
      title: service.title,
      date: this.formatDateInput(service.date),
      churchId: service.churchId,
      siteId: service.siteId || '',
      preacherMode: mode,
      preacherId: service.preacherId || '',
      preacherName: hasInternalPreacher ? '' : (service.preacherName || ''),
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

    this.applyPreacherMode(mode, false);

    if (service.churchId) this.loadSites(service.churchId);
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

  /**
   * ⚠️ Pas de paramètre `roles` : le backend renvoie HTTP 400 sur
   * ?roles=A,B (model binding). On charge tous les utilisateurs
   * actifs et on filtre côté client.
   */
  private loadPreachers(): void {
   this.loadingPreachers.set(true);
  this.userService
    .getUsers({ page: 1, pageSize: 100 } as any)   // ⚠️ maximum autorisé par l'API
    .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const items = (response?.data?.items ?? []) as User[];
          const pastors = items.filter(isPastor);

          console.log(
            `👉 ${items.length} utilisateur(s) reçu(s), ${pastors.length} pasteur(s) retenu(s)`,
            items.map((u: any) => ({
              nom: this.getUserFullName(u),
              rolesBruts: u.roles,
              rolesNormalises: extractRoles(u),
              retenu: isPastor(u),
            }))
          );

          this.allPreachers.set(pastors);
          this.loadingPreachers.set(false);
        },
        error: (err) => {
          console.error('❌ Échec chargement pasteurs', err?.status, err?.error);
          this.allPreachers.set([]);
          this.loadingPreachers.set(false);
          this.error.set(
            `Impossible de charger la liste des pasteurs (HTTP ${err?.status ?? '?'}).`
          );
        },
      });
  }

  // ──────────────────────────────────────────────────────────────
  // PHOTO (upload)
  // ──────────────────────────────────────────────────────────────

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedPhotoFile = input.files[0];
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

    const rawValue = this.form.value;
    const isExternal = rawValue.preacherMode === 'external';

    const preacherId = isExternal ? undefined : (rawValue.preacherId || undefined);
    const preacherName = isExternal
      ? (rawValue.preacherName || '').trim()
      : this.resolvePreacherName(rawValue.preacherId);

    this.saving.set(true);
    this.error.set(null);

    const photoUrlValue = rawValue.attendance?.photoUrl;
    const isValidPhotoUrl =
      photoUrlValue &&
      photoUrlValue !== 'uploading...' &&
      photoUrlValue !== '✅ Fichier sélectionné';
    const photoUrl = isValidPhotoUrl ? photoUrlValue : '';

    const payload: ServiceCreate = {
      title: rawValue.title,
      date: rawValue.date,
      churchId: rawValue.churchId,
      siteId: rawValue.siteId || undefined,
      preacherId,
      preacherName: preacherName || undefined,
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
        photoUrl: photoUrl,
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
        next: (uploadResponse) => {
          if (uploadResponse.success && uploadResponse.photoId) {
            const updatePayload: ServiceUpdate = {
              attendance: { photoUrl: uploadResponse.photoId } as ServiceAttendance,
            };
            this.serviceService.update(serviceId, updatePayload)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: () => this.router.navigate(['/dashboard/cultes']),
                error: () => this.router.navigate(['/dashboard/cultes']),
              });
          } else {
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
    return user.fullName || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  }

  cancel(): void {
    this.router.navigate(['/dashboard/cultes']);
  }
}
