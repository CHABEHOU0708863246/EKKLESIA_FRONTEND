import { Users } from '../../../../../core/services/Users/users';
import { User } from '../../../../../core/models/Users/user.model';

import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil, finalize, debounceTime, distinctUntilChanged } from 'rxjs';

import { Church as ChurchService } from '../../../../../core/services/Church/church';
import {
  AVAILABLE_LANGUAGES,
  AVAILABLE_TIMEZONES,
  AVAILABLE_CURRENCIES,
  MONTHS,
  SERVICE_TYPES
} from '../../../../../core/models/Church/church-settings.model';
import { WEEK_DAYS } from '../../../../../core/models/Members/cell-group.model';
import { ChurchCreate, ChurchUpdate, ChurchUtils } from '../../../../../core/models/Church/church.model';
import { Member } from '../../../../../core/models/Members/member.model';
import { Members } from '../../../../../core/services/Members/members';
import { Roles } from '../../../../../core/services/Roles/roles';

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
  private siteDestroyMap = new Map<number, Subject<void>>();

  pastorSearchControl = new FormControl('');
  searchingPastor = signal(false);
  pastorResults = signal<User[]>([]);        // ✅ User au lieu de Member
  selectedPastorMap = new Map<number, User>(); //

  showPastorResults = signal(false);
  currentSearchSiteIndex = -1;

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
  pastorRoleNames = signal<string[]>([]);

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private churchService: ChurchService,
    private userService: Users,
    private roleService: Roles,
    private route: ActivatedRoute,
    private memberService: Members,
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
    this.loadPastorRoleNames();


    this.churchId = this.route.snapshot.paramMap.get('id');
    this.isEditMode.set(!!this.churchId);

    if (this.isEditMode()) {
      this.loadChurch();
    } else {

    }

    this.pastorSearchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => {
        if (term && term.trim().length >= 2) {
          this.performPastorSearch(term.trim());
        } else {
          this.pastorResults.set([]);
          this.showPastorResults.set(false);
        }
      });
  }

  /**
 * Récupère les vrais libellés (roleName) des rôles pastoraux à partir
 * de leur code, car AddToRolesAsync stocke le Name/roleName sur
 * l'utilisateur — jamais le code.
 */
  private loadPastorRoleNames(): void {
  const pastorCodes = ['PASTOR_PRINCIPAL', 'PASTEUR_SITE'];
  const names: string[] = [];
  let remaining = pastorCodes.length;

  for (const code of pastorCodes) {
    this.roleService
      .getRoleByCode(code)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log(`🔍 getRoleByCode(${code}):`, response); // ← debug
          if (response.success && response.data) {
            names.push(response.data.roleName);
          }
          remaining--;
          if (remaining === 0) {
            console.log('✅ pastorRoleNames final:', names); // ← debug
            this.pastorRoleNames.set(names);
          }
        },
        error: (err) => {
          console.error(`❌ Erreur getRoleByCode(${code}):`, err); // ← debug
          remaining--;
          if (remaining === 0) this.pastorRoleNames.set(names);
        },
      });
  }
}

  getInitialsFromUser(user: User): string {
    const f = user.firstName?.charAt(0) || '?';
    const l = user.lastName?.charAt(0) || '?';
    return `${f}${l}`.toUpperCase();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private performPastorSearch(term: string): void {
  this.searchingPastor.set(true);
  this.showPastorResults.set(true);

  this.userService
    .getUsers({ fullName: term, page: 1, pageSize: 20 } as any)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        console.log('🔍 getUsers réponse brute:', response); // ← debug
        if (response.success && response.data) {
          const allowedNames = this.pastorRoleNames();
          const items = (response.data.items ?? []) as User[];
          console.log('🔍 items reçus AVANT filtre rôle:', items); // ← debug
          console.log('🔍 allowedNames utilisés pour filtrer:', allowedNames); // ← debug

          const filtered = allowedNames.length > 0
            ? items.filter((u) => (u.roles ?? []).some((r) => allowedNames.includes(r)))
            : items;

          console.log('🔍 items APRÈS filtre rôle:', filtered); // ← debug
          this.pastorResults.set(filtered);
        } else {
          this.pastorResults.set([]);
        }
        this.searchingPastor.set(false);
      },
      error: (err) => {
        console.error('❌ Erreur getUsers:', err); // ← debug
        this.pastorResults.set([]);
        this.searchingPastor.set(false);
      },
    });
}


  selectPastor(pastor: User): void {
    const index = this.currentSearchSiteIndex;
    if (index < 0) return;
    const siteGroup = this.sitesArray.at(index) as FormGroup;
    siteGroup.patchValue({
      pastorId: pastor.memberId,
      pastorName: pastor.fullName || `${pastor.firstName} ${pastor.lastName}`
    });
    // Mettre à jour le champ de recherche pour l'affichage
    siteGroup.get('pastorSearch')?.setValue(pastor.fullName || `${pastor.firstName} ${pastor.lastName}`);
    this.showPastorResults.set(false);
    this.pastorResults.set([]);
  }

  clearPastor(siteIndex: number): void {
    const siteGroup = this.sitesArray.at(siteIndex) as FormGroup;
    siteGroup.get('pastorId')?.setValue('');
    this.selectedPastorMap.delete(siteIndex);

    const searchControl = siteGroup.get('pastorSearch') as FormControl;
    if (searchControl) {
      searchControl.setValue('');
    }
  }

  getPastorSearchControl(siteIndex: number): FormControl {
    const group = this.sitesArray.at(siteIndex) as FormGroup;
    return group.get('pastorSearch') as FormControl;
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
        next: (response) => {
          if (response.success && response.data) {
            this.populateForm(response.data);
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

    // Reconstruire le FormArray des sites
    this.sitesArray.clear();
    for (const site of church.sites ?? []) {
      this.sitesArray.push(this.buildSiteGroup(site));
    }

    // Charger le logo si présent
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

    // Vérifier le type et la taille
    if (!file.type.startsWith('image/')) {
      this.error.set('Veuillez sélectionner une image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.error.set('Le logo ne doit pas dépasser 5 Mo.');
      return;
    }

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
      day: [value?.day ?? this.weekDays[6], Validators.required],
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
      phone: [value?.phone ?? ''],
      email: [value?.email ?? '', [Validators.email]],
      pastorId: [value?.pastorId ?? ''],
      isActive: [value?.isActive ?? true],
      address: this.fb.group({
        street: [value?.address?.street ?? ''],
        city: [value?.address?.city ?? '', Validators.required],
        state: [value?.address?.state ?? ''],
        country: [value?.address?.country ?? 'Côte d\'Ivoire'],
        postalCode: [value?.address?.postalCode ?? ''],
        latitude: [value?.address?.latitude ?? null],
        longitude: [value?.address?.longitude ?? null],
        pastorSearch: [''],
        pastorName: [value?.pastorName ?? ''],
      }),
      serviceTimes: this.fb.array(
        (value?.serviceTimes ?? []).map((st: any) => this.buildServiceTimeGroup(st))
      ),
    });
    //group.addControl('pastorSearch', new FormControl(''));
    return group;
  }

  addSite(): void {
    const group = this.buildSiteGroup();
    const index = this.sitesArray.length;
    this.sitesArray.push(group);

    const searchControl = group.get('pastorSearch') as FormControl;
    const siteDestroy$ = new Subject<void>();
    this.siteDestroyMap.set(index, siteDestroy$);

    searchControl.valueChanges
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        takeUntil(siteDestroy$),
        takeUntil(this.destroy$) // double sécurité
      )
      .subscribe((term) => {
        this.currentSearchSiteIndex = index; // <-- on mémorise le site actif
        if (term && term.trim().length >= 2) {
          this.performPastorSearch(term.trim());
        } else {
          this.pastorResults.set([]);
          this.showPastorResults.set(false);
        }
      });
  }

  removeSite(index: number): void {
    // Nettoyer la subscription du site
    const destroy$ = this.siteDestroyMap.get(index);
    if (destroy$) {
      destroy$.next();
      destroy$.complete();
      this.siteDestroyMap.delete(index);
    }
    this.sitesArray.removeAt(index);

    // Réindexer selectedPastorMap ou mieux, stocker le pasteur dans le formulaire
    this.rebuildPastorMap();
  }

  private rebuildPastorMap(): void {
    this.selectedPastorMap = new Map<number, User>();
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

    // ✅ Nettoyer les sites : retirer ceux qui n'ont pas de nom
    const cleanedSites = (value.sites || [])
      .filter((site: any) => site.name && site.name.trim().length > 0)
      .map((site: any) => ({
        name: site.name,
        phone: site.phone || undefined,
        email: site.email || undefined,
        pastorId: site.pastorId || undefined,
        isActive: site.isActive ?? true,
        address: {
          street: site.address?.street || undefined,
          city: site.address?.city || undefined,
          state: site.address?.state || undefined,
          country: site.address?.country || 'Côte d\'Ivoire',
          postalCode: site.address?.postalCode || undefined,
          latitude: site.address?.latitude || undefined,
          longitude: site.address?.longitude || undefined,
          fullAddress: '',        // ✅ Ajouté
          formattedAddress: '',   // ✅ Ajouté
        },
        serviceTimes: (site.serviceTimes || [])
          .filter((st: any) => st.day && st.time)
          .map((st: any) => ({
            day: st.day,
            time: st.time,
            type: st.type || undefined,
          })),
      }));

    const payload: ChurchCreate = {
      name: value.name,
      legalName: value.legalName || undefined,
      email: value.email || undefined,
      phone: value.phone,
      address: {
        street: value.address?.street || undefined,
        city: value.address?.city || undefined,
        state: value.address?.state || undefined,
        country: value.address?.country || 'Côte d\'Ivoire',
        postalCode: value.address?.postalCode || undefined,
        latitude: value.address?.latitude || undefined,
        longitude: value.address?.longitude || undefined,
        fullAddress: '',        // ✅ Ajouté
        formattedAddress: '',   // ✅ Ajouté
      },
      website: value.website || undefined,
      taxId: value.taxId || undefined,
      registrationNumber: value.registrationNumber || undefined,
      foundedDate: value.foundedDate || undefined,
      denomination: value.denomination || undefined,
      missionStatement: value.missionStatement || undefined,
      visionStatement: value.visionStatement || undefined,
      isHeadquarters: value.isHeadquarters,
      parentChurchId: value.parentChurchId || undefined,
      sites: cleanedSites.length > 0 ? cleanedSites : undefined,
      settings: {
        defaultLanguage: value.settings?.defaultLanguage || 'fr',
        timezone: value.settings?.timezone || 'Africa/Abidjan',
        currency: value.settings?.currency || 'FCFA',
        fiscalYearStart: value.settings?.fiscalYearStart || 1,
        serviceTimes: (value.settings?.serviceTimes || [])
          .filter((st: any) => st.day && st.time)
          .map((st: any) => ({
            day: st.day,
            time: st.time,
            type: st.type || undefined,
          })),
      },
    };

    // ✅ Gestion du logo
    const createObservable = this.logoFile
      ? this.churchService.createChurchWithLogo(payload, this.logoFile)
      : this.churchService.createChurch(payload);

    createObservable
      .pipe(takeUntil(this.destroy$), finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.router.navigate(['/dashboard/admin/parametres/eglise/list']);
          } else {
            this.error.set(response.message || 'Une erreur est survenue lors de la création.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur lors de la création de l’église:', err);
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
      address: {
        street: value.address?.street || undefined,
        city: value.address?.city || undefined,
        state: value.address?.state || undefined,
        country: value.address?.country || 'Côte d\'Ivoire',
        postalCode: value.address?.postalCode || undefined,
        latitude: value.address?.latitude || undefined,
        longitude: value.address?.longitude || undefined,
        fullAddress: '',        // ✅ Ajouté
        formattedAddress: '',   // ✅ Ajouté
      },
      website: value.website || undefined,
      taxId: value.taxId || undefined,
      registrationNumber: value.registrationNumber || undefined,
      foundedDate: value.foundedDate || undefined,
      denomination: value.denomination || undefined,
      missionStatement: value.missionStatement || undefined,
      visionStatement: value.visionStatement || undefined,
      isHeadquarters: value.isHeadquarters,
      parentChurchId: value.parentChurchId || undefined,
      settings: {
        defaultLanguage: value.settings?.defaultLanguage || 'fr',
        timezone: value.settings?.timezone || 'Africa/Abidjan',
        currency: value.settings?.currency || 'FCFA',
        fiscalYearStart: value.settings?.fiscalYearStart || 1,
        serviceTimes: (value.settings?.serviceTimes || [])
          .filter((st: any) => st.day && st.time)
          .map((st: any) => ({
            day: st.day,
            time: st.time,
            type: st.type || undefined,
          })),
      },
    };

    this.churchService
      .updateChurch(this.churchId, payload)
      .pipe(takeUntil(this.destroy$), finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.router.navigate(['/dashboard/admin/parametres/eglise/list']);
          } else {
            this.error.set(response.message || 'Une erreur est survenue lors de la mise à jour.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur lors de la mise à jour de l’église:', err);
          this.error.set('Une erreur est survenue lors de la mise à jour.');
        },
      });
  }

  cancel(): void {
    if (this.isEditMode() && this.churchId) {
      this.router.navigate(['/dashboard/admin/parametres/eglise/list']);
    } else {
      this.router.navigate(['/dashboard/admin/parametres/eglise/list']);
    }
  }

  getInitials(): string {
    return ChurchUtils.getInitials(this.form.get('name')?.value ?? '');
  }
}
