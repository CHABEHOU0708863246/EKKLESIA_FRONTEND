// src/app/features/dashboard/finances/offerings/offering-form/offering-form.component.ts

import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { Members } from '../../../../../core/services/Members/members';
import { Church as ChurchService } from '../../../../../core/services/Church/church';
import { Users } from '../../../../../core/services/Users/users';
import { Roles } from '../../../../../core/services/Roles/roles';

import {
  OfferingType,
  OfferingStatus,
  OfferingCreate,
  OfferingUpdate,
  OfferingCategory,
  OfferingCategoryLabels,
  Offering,
} from '../../../../../core/models/Finances/offering.model';
import { OfferingTypeLabels, OfferingTypeIcons } from '../../../../../core/models/Finances/offering.model';
import { Church as ChurchModel } from '../../../../../core/models/Church/church.model';
import { Site } from '../../../../../core/models/Church/site.model';
import { Member } from '../../../../../core/models/Members/member.model';
import { User } from '../../../../../core/models/Users/user.model';
import { PaymentMethod } from '../../../../../core/models/Finances/expense.model';
import { Service as ServiceModel } from '../../../../../core/models/Events/service.model';
import { Offerings } from '../../../../../core/services/Finances/offerings';
import { ApiResponse } from '../../../../../core/models/Common/api-response.model';
import { Service } from '../../../../../core/services/Worship/service';

const TYPE_OPTIONS = Object.values(OfferingType).map((value) => ({
  value,
  label: OfferingTypeLabels[value],
  icon: OfferingTypeIcons[value],
}));

// ✅ Options pour les catégories (choix multiple)
const CATEGORY_OPTIONS = Object.values(OfferingCategory).map((value) => ({
  value,
  label: OfferingCategoryLabels[value],
}));

@Component({
  selector: 'app-offering-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './offering-form.html',
  styleUrls: ['./offering-form.scss'],
})
export class OfferingForm implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private offeringsService = inject(Offerings);
  private memberService = inject(Members);
  private churchService = inject(ChurchService);
  private userService = inject(Users);
  private roleService = inject(Roles);
  private serviceService = inject(Service);
  private router = inject(Router);

  // ── Exposé des énumérations au template ──
  readonly OfferingType = OfferingType;
  readonly OfferingStatus = OfferingStatus;
  readonly PaymentMethod = PaymentMethod;
  readonly typeOptions = TYPE_OPTIONS;
  readonly categoryOptions = CATEGORY_OPTIONS;
  readonly paymentMethods = Object.values(PaymentMethod);

  // ── État ──
  isEditMode = signal(false);
  offeringId: string | null = null;
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  // ── Listes déroulantes ──
  churches = signal<ChurchModel[]>([]);
  loadingChurches = signal(false);
  sites = signal<Site[]>([]);
  loadingSites = signal(false);

  // ── Recherche de membre ──
  searchingMember = signal(false);
  showMemberResults = signal(false);
  memberResults = signal<Member[]>([]);
  selectedMember = signal<Member | null>(null);

  // ── Recherche de service (culte) ──
  searchingService = signal(false);
  showServiceResults = signal(false);
  serviceResults = signal<ServiceModel[]>([]);
  selectedService = signal<ServiceModel | null>(null);

  // ── Photo justificative ──
  photoPreview = signal<string | null>(null);
  selectedPhotoFile: File | null = null;

  form: FormGroup;

  // ── Helpers d'affichage ──
  getPaymentMethodLabel(method: PaymentMethod): string {
    const labels: Record<PaymentMethod, string> = {
      [PaymentMethod.Cash]: 'Espèces',
      [PaymentMethod.BankTransfer]: 'Virement bancaire',
      [PaymentMethod.MobileMoney]: 'Mobile Money',
      [PaymentMethod.Check]: 'Chèque',
      [PaymentMethod.Card]: 'Carte',
      [PaymentMethod.InKind]: 'Don en nature',
    };
    return labels[method] || method;
  }

  getTypeLabel(type: OfferingType): string {
    return OfferingTypeLabels[type] || type;
  }

  getTypeIcon(type: OfferingType): string {
    return OfferingTypeIcons[type] || 'fa-coins';
  }

  // ✅ Helper pour l'URL de la photo
  getPhotoUrl(photoId: string): string {
    if (!photoId) return '';
    return `${this.offeringsService['baseUrl']}/photos/${photoId}`;
  }

  constructor() {
    this.form = this.fb.group({
      type: [OfferingType.Tithe, Validators.required],
      amount: [0, [Validators.required, Validators.min(1)]],
      currency: ['FCFA', Validators.required],
      date: ['', Validators.required],
      memberId: [''],
      memberSearch: [''],
      churchId: ['', Validators.required],
      siteId: [''],
      serviceId: [''],
      serviceSearch: [''],
      paymentMethod: [PaymentMethod.Cash, Validators.required],
      reference: [''],
      notes: [''],
      status: [OfferingStatus.Pending],
      // ✅ Nouveaux champs
      categories: [[], [Validators.required, Validators.minLength(1)]],
      validationPhotoUrl: [''],
    });
  }

  ngOnInit(): void {
    this.loadChurches();

    // Détection du mode édition via l'URL
    const urlSegments = this.router.url.split('/');
    if (urlSegments.includes('edit')) {
      this.isEditMode.set(true);
      const idIndex = urlSegments.indexOf('edit') - 1;
      this.offeringId = urlSegments[idIndex] || null;
      if (this.offeringId) {
        this.loadOfferingData(this.offeringId);
      }
    }

    // ── Réactivité église → sites ──
    this.form.get('churchId')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((churchId: string) => {
        this.form.get('siteId')?.setValue('');
        this.sites.set([]);
        if (churchId) this.loadSites(churchId);
      });

    // ── Recherche de membre ──
    this.form.get('memberSearch')?.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term: string) => {
        if (term && term.trim().length >= 2) {
          this.searchMembers(term.trim());
        } else {
          this.memberResults.set([]);
          this.showMemberResults.set(false);
        }
      });

    // ── Recherche de service (culte) ──
    this.form.get('serviceSearch')?.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term: string) => {
        if (term && term.trim().length >= 2) {
          this.searchServices(term.trim());
        } else {
          this.serviceResults.set([]);
          this.showServiceResults.set(false);
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

  private loadOfferingData(id: string): void {
    this.offeringsService.getById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.populateForm(response.data);
        } else {
          this.error.set('Impossible de charger l\'offrande.');
        }
      },
      error: () => this.error.set('Erreur lors du chargement de l\'offrande.'),
    });
  }

  private populateForm(offering: any): void {
    // Remplir les champs
    this.form.patchValue({
      type: offering.type,
      amount: offering.amount,
      currency: offering.currency || 'FCFA',
      date: this.formatDateInput(offering.date),
      memberId: offering.memberId || '',
      memberSearch: offering.memberName || '',
      churchId: offering.churchId,
      siteId: offering.siteId || '',
      serviceId: offering.serviceId || '',
      serviceSearch: offering.serviceTitle || '',
      paymentMethod: offering.paymentMethod || PaymentMethod.Cash,
      reference: offering.reference || '',
      notes: offering.notes || '',
      status: offering.status || OfferingStatus.Pending,
      // ✅ Nouveaux champs
      categories: offering.categories || [],
      validationPhotoUrl: offering.validationPhotoUrl || '',
    });

    // Si membre existe, le sélectionner
    if (offering.memberId) {
      this.selectedMember.set({
        id: offering.memberId,
        firstName: offering.memberName?.split(' ')[0] || '',
        lastName: offering.memberName?.split(' ')[1] || '',
        fullName: offering.memberName || '',
      } as any as Member);
    }

    // Si service existe, le sélectionner
    if (offering.serviceId) {
      this.selectedService.set({
        id: offering.serviceId,
        title: offering.serviceTitle || 'Culte',
        formattedDate: offering.formattedDate || '',
      } as any as ServiceModel);
    }

    // Charger les sites pour l'église sélectionnée
    if (offering.churchId) {
      this.loadSites(offering.churchId);
    }

    // Afficher l'aperçu de la photo si elle existe
    if (offering.validationPhotoUrl) {
      this.photoPreview.set(this.getPhotoUrl(offering.validationPhotoUrl));
    }
  }

  private formatDateInput(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT DES LISTES (églises, sites)
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

 // ─── RECHERCHE DE MEMBRE ──────────────────────────────────

private searchMembers(term: string): void {
  this.searchingMember.set(true);
  this.showMemberResults.set(true);

  this.memberService
    .getMembers({ page: 1, pageSize: 8, fullName: term } as any)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        let items: Member[] = [];

        // ✅ Détection automatique de la structure
        if (response && response.success && response.data) {
          // Cas 1 : wrapper ApiResponse
          items = (response.data as any).items || [];
        } else if (response && 'items' in response) {
          // Cas 2 : réponse directe (fallback)
          items = (response as any).items || [];
        }

        this.memberResults.set(items);
        this.searchingMember.set(false);
      },
      error: () => {
        this.memberResults.set([]);
        this.searchingMember.set(false);
      },
    });
}

  selectMember(member: Member): void {
    this.selectedMember.set(member);
    this.form.patchValue({
      memberId: member.id,
      memberSearch: `${member.firstName} ${member.lastName}`,
    });
    this.showMemberResults.set(false);
    this.memberResults.set([]);
  }

  clearMember(): void {
    this.selectedMember.set(null);
    this.form.patchValue({ memberId: '', memberSearch: '' });
  }

  getMemberFullName(member: Member): string {
    return `${member.firstName} ${member.lastName}`.trim();
  }

  getMemberInitials(member: Member): string {
    const f = member.firstName?.charAt(0) || '?';
    const l = member.lastName?.charAt(0) || '?';
    return `${f}${l}`.toUpperCase();
  }

  // ─── RECHERCHE DE SERVICE (culte) ──────────────────────────

  private searchServices(term: string): void {
    this.searchingService.set(true);
    this.showServiceResults.set(true);

    this.serviceService
      .getAll({ page: 1, pageSize: 8, title: term } as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          let items: ServiceModel[] = [];

          // ✅ Vérifier que response est bien un ApiResponse
          if (response && response.success && response.data) {
            // Cas 1 : wrapper ApiResponse (structure attendue)
            items = (response.data as any).items || [];
          } else if (response && 'items' in response) {
            // Cas 2 : réponse directe (fallback)
            items = (response as any).items || [];
          }

          this.serviceResults.set(items);
          this.searchingService.set(false);
        },
        error: () => {
          this.serviceResults.set([]);
          this.searchingService.set(false);
        },
      });
  }

  selectService(service: ServiceModel): void {
    this.selectedService.set(service);
    // ✅ Construction de l'affichage avec la date formatée
    const displayDate = service.formattedDate ||
      new Date(service.date).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    this.form.patchValue({
      serviceId: service.id,
      serviceSearch: `${service.title} (${displayDate})`,
    });
    this.showServiceResults.set(false);
    this.serviceResults.set([]);
  }

  clearService(): void {
    this.selectedService.set(null);
    this.form.patchValue({ serviceId: '', serviceSearch: '' });
  }

  // ──────────────────────────────────────────────────────────────
  // GESTION DES CATÉGORIES (choix multiple)
  // ──────────────────────────────────────────────────────────────

  isCategorySelected(category: OfferingCategory): boolean {
    const categories = this.form.get('categories')?.value || [];
    return categories.includes(category);
  }

  toggleCategory(category: OfferingCategory, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const currentCategories = this.form.get('categories')?.value || [];
    let newCategories: OfferingCategory[];

    if (checkbox.checked) {
      newCategories = [...currentCategories, category];
    } else {
      newCategories = currentCategories.filter((c: OfferingCategory) => c !== category);
    }

    this.form.patchValue({ categories: newCategories });
    this.form.get('categories')?.markAsTouched();
  }

  // ──────────────────────────────────────────────────────────────
  // GESTION DE LA PHOTO
  // ──────────────────────────────────────────────────────────────

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  private handleFile(file: File): void {
    // Vérifier le type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      this.error.set('Type de fichier non autorisé. Formats acceptés : JPEG, PNG, WEBP.');
      return;
    }

    // Vérifier la taille (5 Mo max)
    if (file.size > 5 * 1024 * 1024) {
      this.error.set('La photo dépasse la taille maximale autorisée (5 Mo).');
      return;
    }

    this.selectedPhotoFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.photoPreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Marquer le champ comme touché pour la validation
    this.form.get('validationPhotoUrl')?.markAsTouched();
    this.form.get('validationPhotoUrl')?.setValue('uploading...');
  }

  removePhoto(): void {
    this.selectedPhotoFile = null;
    this.photoPreview.set(null);
    this.form.patchValue({ validationPhotoUrl: '' });
  }

  // ──────────────────────────────────────────────────────────────
  // UPLOAD DE LA PHOTO (après création ou mise à jour)
  // ──────────────────────────────────────────────────────────────

  private uploadPhoto(offeringId: string): Observable<ApiResponse<Offering>> {
    if (!this.selectedPhotoFile) {
      return new Observable(observer => {
        observer.next({ success: true, data: null as any, message: 'Aucune photo à uploader' });
        observer.complete();
      });
    }
    return this.offeringsService.uploadValidationPhoto(offeringId, this.selectedPhotoFile);
  }

  // ──────────────────────────────────────────────────────────────
  // VALIDATION / SOUMISSION
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

    const payload: OfferingCreate | OfferingUpdate = {
      type: raw.type,
      amount: raw.amount,
      currency: raw.currency,
      date: raw.date,
      memberId: raw.memberId || undefined,
      churchId: raw.churchId,
      siteId: raw.siteId || undefined,
      serviceId: raw.serviceId || undefined,
      paymentMethod: raw.paymentMethod,
      reference: raw.reference || undefined,
      notes: raw.notes || undefined,
      status: raw.status || OfferingStatus.Pending,
      // ✅ Nouveaux champs
      categories: raw.categories || [],
      validationPhotoUrl: raw.validationPhotoUrl || '',
    };

    const request$ = this.isEditMode() && this.offeringId
      ? this.offeringsService.update(this.offeringId, payload)
      : this.offeringsService.create(payload as OfferingCreate);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.saving.set(false);
        if (response.success && response.data) {
          const offeringId = response.data.id;

          // Si une photo a été sélectionnée, l'uploader
          if (this.selectedPhotoFile) {
            this.uploadPhoto(offeringId).pipe(takeUntil(this.destroy$)).subscribe({
              next: (uploadResponse) => {
                this.success.set(true);
                setTimeout(() => {
                  this.success.set(false);
                  this.router.navigate(['/dashboard/offrandes', offeringId]);
                }, 1000);
              },
              error: (err) => {
                console.error('❌ Erreur upload photo:', err);
                this.error.set('Offrande créée, mais erreur lors de l\'upload de la photo.');
                this.router.navigate(['/dashboard/offrandes', offeringId]);
              }
            });
          } else {
            this.success.set(true);
            setTimeout(() => {
              this.success.set(false);
              this.router.navigate(['/dashboard/offrandes', offeringId]);
            }, 1000);
          }
        } else {
          this.error.set(response.message || 'Erreur lors de l\'enregistrement.');
        }
      },
      error: (err) => {
        console.error('❌ Erreur:', err);
        this.saving.set(false);
        this.error.set('Une erreur est survenue.');
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/dashboard/offrandes']);
  }
}
