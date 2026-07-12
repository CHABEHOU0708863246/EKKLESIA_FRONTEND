import { Component, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil, finalize } from 'rxjs';
import { Notification } from '../../../../../core/services/Notification/notification';

import { Church as ChurchService } from '../../../../../core/services/Church/church';
import { Site, SiteCreate, SiteUtils, AddressUtils } from '../../../../../core/models/Church/site.model';
import { ApiResponse } from '../../../../../core/models/Common/api-response.model';
import {
  Church,
  ChurchUpdate,
  ChurchUtils
} from '../../../../../core/models/Church/church.model';

@Component({
  selector: 'app-church-edit',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './church-edit.html',
  styleUrl: './church-edit.scss',
})
export class ChurchEdit implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ── État ──
  churchId: string | null = null;
  church: WritableSignal<Church | null> = signal(null);
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  isEditMode = signal(false);

  // ── Sites ──
  sites: WritableSignal<Site[]> = signal([]);
  loadingSites = signal(false);
  siteError = signal<string | null>(null);

  // ── Ajout/édition d'un site ──
  showSiteForm = signal(false);
  editingSite: WritableSignal<Site | null> = signal(null);
  siteForm: FormGroup;
  savingSite = signal(false);

  // ── Formulaire principal ──
  churchForm: FormGroup;

  protected readonly ChurchUtils = ChurchUtils;
  protected readonly AddressUtils = AddressUtils;
  protected readonly SiteUtils = SiteUtils;

  constructor(
    private fb: FormBuilder,
    private churchService: ChurchService,
    private route: ActivatedRoute,
    private notificationService: Notification,
    private router: Router,
  ) {
    this.churchForm = this.fb.group({
      name: ['', Validators.required],
      legalName: [''],
      email: ['', [Validators.email]],
      phone: ['', Validators.required],
      website: [''],
      logoUrl: [''],
      taxId: [''],
      registrationNumber: [''],
      foundedDate: [''],
      denomination: [''],
      missionStatement: [''],
      visionStatement: [''],
      isHeadquarters: [false],
      parentChurchId: [''],
      addressStreet: [''],
      addressCity: [''],
      addressState: [''],
      addressCountry: [''],
      addressPostalCode: [''],
      addressLatitude: [null],
      addressLongitude: [null],
      settingsDefaultLanguage: ['fr'],
      settingsTimezone: ['Africa/Abidjan'],
      settingsCurrency: ['FCFA'],
      settingsFiscalYearStart: [1],
    });

    this.siteForm = this.fb.group({
      name: ['', Validators.required],
      phone: [''],
      email: ['', [Validators.email]],
      pastorId: [''],
      addressStreet: [''],
      addressCity: [''],
      addressState: [''],
      addressCountry: [''],
      addressPostalCode: [''],
      addressLatitude: [null],
      addressLongitude: [null],
      isActive: [true],
      serviceTimes: [[]],
    });
  }

  ngOnInit(): void {
    this.churchId = this.route.snapshot.paramMap.get('id');
    if (this.churchId) {
      this.isEditMode.set(true);
      this.loadChurch();
      this.loadSites();
    } else {
      this.loading.set(false);
      this.isEditMode.set(false);
      this.church.set(null);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── CHARGEMENT ──────────────────────────────────────────────────────

  private loadChurch(): void {
    if (!this.churchId) return;
    this.loading.set(true);
    this.error.set(null);

    this.churchService
      .getChurchById(this.churchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponse<Church>) => {
          if (response.success && response.data) {
            this.church.set(response.data);
            this.populateForm(response.data);
          } else {
            this.error.set(response.message || 'Église introuvable.');
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error('❌ Erreur chargement église:', err);
          this.error.set('Impossible de charger l\'église.');
          this.loading.set(false);
        },
      });
  }

  private loadSites(): void {
    if (!this.churchId) return;
    this.loadingSites.set(true);
    this.siteError.set(null);

    this.churchService
      .getSitesByChurchId(this.churchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponse<Site[]>) => {
          if (response.success && response.data) {
            this.sites.set(response.data);
          } else {
            this.siteError.set(response.message || 'Impossible de charger les sites.');
          }
          this.loadingSites.set(false);
        },
        error: (err) => {
          console.error('❌ Erreur chargement sites:', err);
          this.siteError.set('Impossible de charger les sites.');
          this.loadingSites.set(false);
        },
      });
  }

  // ─── FORMULAIRE ──────────────────────────────────────────────────────

  private populateForm(church: Church): void {
    this.churchForm.patchValue({
      name: church.name,
      legalName: church.legalName ?? '',
      email: church.email ?? '',
      phone: church.phone,
      website: church.website ?? '',
      logoUrl: church.logoUrl ?? '',
      taxId: church.taxId ?? '',
      registrationNumber: church.registrationNumber ?? '',
      foundedDate: church.foundedDate ? church.foundedDate.split('T')[0] : '',
      denomination: church.denomination ?? '',
      missionStatement: church.missionStatement ?? '',
      visionStatement: church.visionStatement ?? '',
      isHeadquarters: church.isHeadquarters,
      parentChurchId: church.parentChurchId ?? '',
      addressStreet: church.address?.street ?? '',
      addressCity: church.address?.city ?? '',
      addressState: church.address?.state ?? '',
      addressCountry: church.address?.country ?? '',
      addressPostalCode: church.address?.postalCode ?? '',
      addressLatitude: church.address?.latitude ?? null,
      addressLongitude: church.address?.longitude ?? null,
      settingsDefaultLanguage: church.settings?.defaultLanguage ?? 'fr',
      settingsTimezone: church.settings?.timezone ?? 'Africa/Abidjan',
      settingsCurrency: church.settings?.currency ?? 'FCFA',
      settingsFiscalYearStart: church.settings?.fiscalYearStart ?? 1,
    });
  }

  private getChurchUpdateData(): ChurchUpdate {
    const val = this.churchForm.value;
    return {
      name: val.name,
      legalName: val.legalName || undefined,
      email: val.email || undefined,
      phone: val.phone,
      website: val.website || undefined,
      logoUrl: val.logoUrl || undefined,
      taxId: val.taxId || undefined,
      registrationNumber: val.registrationNumber || undefined,
      foundedDate: val.foundedDate || undefined,
      denomination: val.denomination || undefined,
      missionStatement: val.missionStatement || undefined,
      visionStatement: val.visionStatement || undefined,
      isHeadquarters: val.isHeadquarters,
      parentChurchId: val.parentChurchId || undefined,
      isActive: this.church()?.isActive,
      address: {
        street: val.addressStreet || undefined,
        city: val.addressCity || undefined,
        state: val.addressState || undefined,
        country: val.addressCountry || undefined,
        postalCode: val.addressPostalCode || undefined,
        latitude: val.addressLatitude || undefined,
        longitude: val.addressLongitude || undefined,
        fullAddress: '',
        formattedAddress: '',
      },
      settings: {
        defaultLanguage: val.settingsDefaultLanguage,
        timezone: val.settingsTimezone,
        currency: val.settingsCurrency,
        fiscalYearStart: val.settingsFiscalYearStart,
        serviceTimes: this.church()?.settings?.serviceTimes || [],
      },
    };
  }

  // ─── SAUVEGARDE DE L'ÉGLISE ─────────────────────────────────────────

  saveChurch(): void {
    if (this.churchForm.invalid) {
      this.churchForm.markAllAsTouched();
      this.error.set('Veuillez corriger les champs invalides.');
      return;
    }
    if (!this.churchId) return;

    this.saving.set(true);
    this.error.set(null);
    const payload = this.getChurchUpdateData();

    this.churchService
      .updateChurch(this.churchId, payload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.saving.set(false))
      )
      .subscribe({
        next: (response: ApiResponse<Church>) => {
          if (response.success && response.data) {
            this.church.set(response.data);
            this.populateForm(response.data);
            this.error.set(null);
            this.notificationService.success('Succès', 'Église mise à jour avec succès');
          } else {
            this.error.set(response.message || 'Erreur lors de la mise à jour.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur mise à jour église:', err);
          this.error.set('Erreur serveur.');
          this.notificationService.error('Erreur','Erreur serveur lors de la sauvegarde du site');
        },
      });
  }

  // ─── GESTION DES SITES ──────────────────────────────────────────────

  startAddSite(): void {
    this.editingSite.set(null);
    this.siteForm.reset({ isActive: true });
    this.showSiteForm.set(true);
  }

  startEditSite(site: Site, event: Event): void {
    event.stopPropagation();
    this.editingSite.set(site);
    this.siteForm.patchValue({
      name: site.name,
      phone: site.phone ?? '',
      email: site.email ?? '',
      pastorId: site.pastorId ?? '',
      addressStreet: site.address?.street ?? '',
      addressCity: site.address?.city ?? '',
      addressState: site.address?.state ?? '',
      addressCountry: site.address?.country ?? '',
      addressPostalCode: site.address?.postalCode ?? '',
      addressLatitude: site.address?.latitude ?? null,
      addressLongitude: site.address?.longitude ?? null,
      isActive: site.isActive,
      serviceTimes: site.serviceTimes || [],
    });
    this.showSiteForm.set(true);
  }

  cancelSiteForm(): void {
    this.showSiteForm.set(false);
    this.editingSite.set(null);
    this.siteForm.reset();
  }

  saveSite(): void {
    if (this.siteForm.invalid) {
      this.siteForm.markAllAsTouched();
      this.siteError.set('Veuillez corriger les champs.');
      return;
    }
    if (!this.churchId) return;

    this.savingSite.set(true);
    this.siteError.set(null);
    const val = this.siteForm.value;

    const sitePayload: SiteCreate = {
      name: val.name,
      phone: val.phone || undefined,
      email: val.email || undefined,
      pastorId: val.pastorId || undefined,
      isActive: val.isActive,
      serviceTimes: val.serviceTimes || [],
      address: {
        street: val.addressStreet || undefined,
        city: val.addressCity || undefined,
        state: val.addressState || undefined,
        country: val.addressCountry || undefined,
        postalCode: val.addressPostalCode || undefined,
        latitude: val.addressLatitude || undefined,
        longitude: val.addressLongitude || undefined,
        fullAddress: '',
        formattedAddress: '',
      },
    };

    const request$ = this.editingSite()
      ? this.churchService.updateSite(this.churchId, this.editingSite()!.id, sitePayload)
      : this.churchService.addSiteToChurch(this.churchId, sitePayload);

    request$
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.savingSite.set(false))
      )
      .subscribe({
        next: (response: ApiResponse<Site>) => {
          if (response.success && response.data) {
            const current = this.sites();
            if (this.editingSite()) {
              const index = current.findIndex((s) => s.id === response.data!.id);
              if (index !== -1) {
                current[index] = response.data!;
                this.sites.set([...current]);
              }
            } else {
              this.sites.set([...current, response.data]);
            }
            this.cancelSiteForm();
            this.siteError.set(null);
          } else {
            this.siteError.set(response.message || 'Erreur lors de la sauvegarde du site.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur sauvegarde site:', err);
          this.siteError.set('Erreur serveur.');
        },
      });
  }

  deleteSite(site: Site, event: Event): void {
    event.stopPropagation();
    if (!this.churchId) return;
    if (!confirm(`Supprimer le site "${site.name}" ?`)) return;

    this.churchService
      .removeSite(this.churchId, site.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponse<boolean>) => {
          if (response.success) {
            this.sites.update((list) => list.filter((s) => s.id !== site.id));
            this.notificationService.success('Succès',`Site "${site.name}" supprimé avec succès`);
          } else {
            this.siteError.set(response.message || 'Erreur lors de la suppression.');
            this.notificationService.error('Erreur','Erreur serveur lors de la suppression du site');
          }
        },
        error: (err) => {
          console.error('❌ Erreur suppression site:', err);
          this.siteError.set('Erreur serveur.');
        },
      });
  }

  toggleSiteStatus(site: Site, event: Event): void {
    event.stopPropagation();
    if (!this.churchId) return;

    this.churchService
      .toggleSiteStatus(this.churchId, site.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponse<boolean>) => {
          if (response.success) {
            this.sites.update((list) =>
              list.map((s) => (s.id === site.id ? { ...s, isActive: !s.isActive } : s))
            );
            // ✅ Notification de succès
            const status = site.isActive ? 'désactivé' : 'activé';
            this.notificationService.success('Succès',`Site "${site.name}" ${status} avec succès`);
          } else {
            this.siteError.set(response.message || 'Erreur lors du changement de statut.');
            this.notificationService.error('Erreur',response.message || 'Erreur lors du changement de statut');
          }
        },
        error: (err) => {
          console.error('❌ Erreur toggle site:', err);
          this.siteError.set('Erreur serveur.');
          this.notificationService.error('Erreur','Erreur serveur lors du changement de statut');
        },
      });
  }

  closePanel(): void {
    this.router.navigate(['/dashboard/admin/parametres/eglise/list']);
  }

  // ─── HELPERS ────────────────────────────────────────────────────────

  getStatusBadge(isActive: boolean) {
    return ChurchUtils.getStatusBadge(isActive);
  }

  getSiteStatusBadge(isActive: boolean) {
    return SiteUtils.getStatusBadge(isActive);
  }

  getSiteAddress(site: Site): string {
    return SiteUtils.getFormattedAddress(site);
  }

  getSiteServices(site: Site): string {
    return SiteUtils.getFormattedServices(site.serviceTimes);
  }

  getInitials(name: string): string {
    return ChurchUtils.getInitials(name);
  }
}
