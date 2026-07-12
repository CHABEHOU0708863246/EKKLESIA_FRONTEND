import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';


import { Church } from '../../../../../core/services/Church/church';
import { AVAILABLE_LANGUAGES, AVAILABLE_TIMEZONES, AVAILABLE_CURRENCIES, MONTHS, SERVICE_TYPES } from '../../../../../core/models/Church/church-settings.model';
import { WEEK_DAYS } from '../../../../../core/models/Members/cell-group.model';
import { ChurchCreate, ChurchUpdate, ChurchUtils } from '../../../../../core/models/Church/church.model';

@Component({
  selector: 'app-church-form',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './church-form.html',
  styleUrl: './church-form.scss',
})
export class ChurchForm implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private churchId: string | null = null;

  readonly languages = AVAILABLE_LANGUAGES;
  readonly timezones = AVAILABLE_TIMEZONES;
  readonly currencies = AVAILABLE_CURRENCIES;
  readonly months = MONTHS;
  readonly weekDays = WEEK_DAYS;
  readonly serviceTypes = SERVICE_TYPES;

  isEditMode = signal(false);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);

  logoFile: File | null = null;
  logoPreviewUrl = signal<string | null>(null);

  showSettingsSection = signal(true);
  showSitesSection = signal(true);

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private churchService: Church,
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.form = this.fb.group({
      // ── Informations générales ──
      name: ['', [Validators.required, Validators.minLength(2)]],
      legalName: [''],
      email: ['', [Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9+\s]{8,15}$/)]],
      website: [''],
      taxId: [''],
      registrationNumber: [''],
      foundedDate: [''],
      denomination: [''],
      isHeadquarters: [true],
      parentChurchId: [''],

      // ── Mission / Vision ──
      missionStatement: [''],
      visionStatement: [''],

      // ── Adresse ──
      address: this.fb.group({
        street: ['', Validators.required],
        city: ['', Validators.required],
        state: [''],
        country: ['Côte d\'Ivoire', Validators.required],
        postalCode: [''],
        latitude: [null],
        longitude: [null],
      }),

      // ── Paramètres ──
      settings: this.fb.group({
        defaultLanguage: ['fr', Validators.required],
        timezone: ['Africa/Abidjan', Validators.required],
        currency: ['FCFA', Validators.required],
        fiscalYearStart: [1, Validators.required],
        serviceTimes: this.fb.array([]),
      }),

      // ── Sites (multi-site dès la création) ──
      sites: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.churchId = this.route.snapshot.paramMap.get('id');
    this.isEditMode.set(!!this.churchId);

    if (this.isEditMode()) {
      this.loadChurch();
    } else {
      // Un premier site par défaut pour guider la saisie (retirable)
      this.addSite();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT (mode édition)
  // ───────────────────────────────────────────────────────────────

  private loadChurch(): void {
    if (!this.churchId) return;
    this.loading.set(true);

    this.churchService
      .getChurchById(this.churchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { success: any; data: any; message: any; }) => {
          if (response.success && response.data) {
            this.populateForm(response.data as any);
          } else {
            this.error.set(response.message || 'Impossible de charger cette église.');
          }
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger cette église.');
          this.loading.set(false);
        },
      });
  }

  private populateForm(church: any): void {
    this.form.patchValue({
      name: church.name,
      legalName: church.legalName ?? '',
      email: church.email ?? '',
      phone: church.phone,
      website: church.website ?? '',
      taxId: church.taxId ?? '',
      registrationNumber: church.registrationNumber ?? '',
      foundedDate: this.toDateInputValue(church.foundedDate),
      denomination: church.denomination ?? '',
      isHeadquarters: church.isHeadquarters,
      parentChurchId: church.parentChurchId ?? '',
      missionStatement: church.missionStatement ?? '',
      visionStatement: church.visionStatement ?? '',
      address: {
        street: church.address?.street ?? '',
        city: church.address?.city ?? '',
        state: church.address?.state ?? '',
        country: church.address?.country ?? '',
        postalCode: church.address?.postalCode ?? '',
        latitude: church.address?.latitude ?? null,
        longitude: church.address?.longitude ?? null,
      },
      settings: {
        defaultLanguage: church.settings?.defaultLanguage ?? 'fr',
        timezone: church.settings?.timezone ?? 'Africa/Abidjan',
        currency: church.settings?.currency ?? 'FCFA',
        fiscalYearStart: church.settings?.fiscalYearStart ?? 1,
      },
    }, { emitEvent: false });

    // Reconstruire le FormArray des horaires de culte (settings)
    this.serviceTimesArray.clear();
    for (const st of church.settings?.serviceTimes ?? []) {
      this.serviceTimesArray.push(this.buildServiceTimeGroup(st));
    }

    // Reconstruire le FormArray des sites (en édition, on n'affiche que
    // la liste ; l'ajout/retrait de site se fait normalement via un
    // écran de détail dédié — ici on permet quand même la relecture)
    this.sitesArray.clear();
    for (const site of church.sites ?? []) {
      this.sitesArray.push(this.buildSiteGroup(site));
    }

    if (church.logoUrl) {
      this.logoPreviewUrl.set(church.logoUrl);
    }
  }

  private toDateInputValue(date: string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  // ───────────────────────────────────────────────────────────────
  // LOGO
  // ───────────────────────────────────────────────────────────────

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.logoFile = file;
    const reader = new FileReader();
    reader.onload = () => this.logoPreviewUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  clearLogo(): void {
    this.logoFile = null;
    this.logoPreviewUrl.set(null);
  }

  // ───────────────────────────────────────────────────────────────
  // HORAIRES DE CULTE (settings.serviceTimes)
  // ───────────────────────────────────────────────────────────────

  get serviceTimesArray(): FormArray {
    return this.form.get('settings.serviceTimes') as FormArray;
  }

  private buildServiceTimeGroup(value?: { day?: string; time?: string; type?: string }): FormGroup {
    return this.fb.group({
      day: [value?.day ?? this.weekDays[6], Validators.required], // Dimanche par défaut
      time: [value?.time ?? '08:00', Validators.required],
      type: [value?.type ?? this.serviceTypes[0], Validators.required],
    });
  }

  addServiceTime(): void {
    this.serviceTimesArray.push(this.buildServiceTimeGroup());
  }

  removeServiceTime(index: number): void {
    this.serviceTimesArray.removeAt(index);
  }

  // ───────────────────────────────────────────────────────────────
  // SITES (multi-site)
  // ───────────────────────────────────────────────────────────────

  get sitesArray(): FormArray {
    return this.form.get('sites') as FormArray;
  }

  private buildSiteGroup(value?: any): FormGroup {
    const group = this.fb.group({
      name: [value?.name ?? '', [Validators.required, Validators.minLength(2)]],
      address: this.fb.group({
        street: [value?.address?.street ?? ''],
        city: [value?.address?.city ?? '', Validators.required],
        state: [value?.address?.state ?? ''],
        country: [value?.address?.country ?? 'Côte d\'Ivoire'],
        postalCode: [value?.address?.postalCode ?? ''],
        latitude: [value?.address?.latitude ?? null],
        longitude: [value?.address?.longitude ?? null],
      }),
      serviceTimes: this.fb.array(
        (value?.serviceTimes ?? []).map((st: any) => this.buildServiceTimeGroup(st))
      ),
    });
    return group;
  }

  addSite(): void {
    this.sitesArray.push(this.buildSiteGroup());
  }

  removeSite(index: number): void {
    this.sitesArray.removeAt(index);
  }

  getSiteServiceTimes(siteIndex: number): FormArray {
    return this.sitesArray.at(siteIndex).get('serviceTimes') as FormArray;
  }

  addSiteServiceTime(siteIndex: number): void {
    this.getSiteServiceTimes(siteIndex).push(this.buildServiceTimeGroup());
  }

  removeSiteServiceTime(siteIndex: number, timeIndex: number): void {
    this.getSiteServiceTimes(siteIndex).removeAt(timeIndex);
  }

  // ───────────────────────────────────────────────────────────────
  // VALIDATION / SOUMISSION
  // ───────────────────────────────────────────────────────────────

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  isSiteFieldInvalid(siteIndex: number, field: string): boolean {
    const control = this.sitesArray.at(siteIndex).get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Veuillez corriger les champs invalides avant de continuer.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    if (this.isEditMode()) {
      this.updateExistingChurch();
    } else {
      this.createNewChurch();
    }
  }

  private createNewChurch(): void {
    const value = this.form.value;
    const payload: ChurchCreate = {
      name: value.name,
      legalName: value.legalName || undefined,
      email: value.email || undefined,
      phone: value.phone,
      address: value.address,
      website: value.website || undefined,
      taxId: value.taxId || undefined,
      registrationNumber: value.registrationNumber || undefined,
      foundedDate: value.foundedDate || undefined,
      denomination: value.denomination || undefined,
      missionStatement: value.missionStatement || undefined,
      visionStatement: value.visionStatement || undefined,
      isHeadquarters: value.isHeadquarters,
      parentChurchId: value.parentChurchId || undefined,
      sites: value.sites,
      settings: value.settings,
    };

    this.churchService
      .createChurch(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { success: any; data: any; message: any; }) => {
          this.saving.set(false);
          if (response.success && response.data) {
            this.router.navigate(['/dashboard/admin/parametres/eglise', (response.data as any).id]);
          } else {
            this.error.set(response.message || 'Une erreur est survenue lors de la création.');
          }
        },
        error: (err: any) => {
          console.error('❌ Erreur lors de la création de l’église:', err);
          this.saving.set(false);
          this.error.set('Une erreur est survenue lors de la création.');
        },
      });
  }

  private updateExistingChurch(): void {
    if (!this.churchId) return;
    const value = this.form.value;
    const payload: ChurchUpdate = {
      name: value.name,
      legalName: value.legalName || undefined,
      email: value.email || undefined,
      phone: value.phone,
      address: value.address,
      website: value.website || undefined,
      taxId: value.taxId || undefined,
      registrationNumber: value.registrationNumber || undefined,
      foundedDate: value.foundedDate || undefined,
      denomination: value.denomination || undefined,
      missionStatement: value.missionStatement || undefined,
      visionStatement: value.visionStatement || undefined,
      isHeadquarters: value.isHeadquarters,
      parentChurchId: value.parentChurchId || undefined,
      settings: value.settings,
    };

    this.churchService
      .updateChurch(this.churchId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { success: any; message: any; }) => {
          this.saving.set(false);
          if (response.success) {
            this.router.navigate(['/dashboard/admin/parametres/eglise', this.churchId]);
          } else {
            this.error.set(response.message || 'Une erreur est survenue lors de la mise à jour.');
          }
        },
        error: (err: any) => {
          console.error('❌ Erreur lors de la mise à jour de l’église:', err);
          this.saving.set(false);
          this.error.set('Une erreur est survenue lors de la mise à jour.');
        },
      });
  }

  cancel(): void {
    if (this.isEditMode() && this.churchId) {
      this.router.navigate(['/dashboard/admin/parametres/eglise', this.churchId]);
    } else {
      this.router.navigate(['/dashboard/admin/parametres/eglise']);
    }
  }

  getInitials(): string {
    return ChurchUtils.getInitials(this.form.get('name')?.value ?? '');
  }
}
