// src/app/features/dashboard/finances/offerings/offering-form/offering-form.component.ts

import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
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
  OfferingLinePayload,
  Offering,
} from '../../../../../core/models/Finances/offering.model';
import { OfferingTypeLabels, OfferingTypeIcons } from '../../../../../core/models/Finances/offering.model';
import { Church as ChurchModel } from '../../../../../core/models/Church/church.model';
import { Site } from '../../../../../core/models/Church/site.model';
import { Member } from '../../../../../core/models/Members/member.model';
import { User } from '../../../../../core/models/Users/user.model';
import { PaymentMethod } from '../../../../../core/models/Finances/expense.model';
import { Service as ServiceModel } from '../../../../../core/models/Events/service.model';
import { Offerings, OfferingCategoryOption } from '../../../../../core/services/Finances/offerings';
import { ApiResponse } from '../../../../../core/models/Common/api-response.model';
import { Service } from '../../../../../core/services/Worship/service';
import { AuthImageDirective } from '../../../../../core/directives/auth-image.directive';
import { Permissions } from '../../../../../core/services/Permissions/permissions';
import { Currency as CurrencyService, CurrencyCatalogItem } from '../../../../../core/services/Currency/currency';
import { Token } from '../../../../../core/services/Token/token';
import { FormGuide, GuideStep } from '../../../../../core/components/form-guide/form-guide';
import { UploadField } from '../../../../../core/components/upload-field/upload-field';
import { MemberSelect } from '../../../../../core/components/member-select/member-select';
import { IMAGE_FILE_LIMITS } from '../../../../../core/utils/file-validation';

/**
 * Table de correspondance catégorie (Paramètres) → type technique conservé pour
 * la compatibilité `offering.type`. Plus aucun choix manuel : le type est
 * déduit de la ligne la plus élevée.
 */
const CATEGORY_TO_TYPE: Record<string, OfferingType> = {
  Tithe: OfferingType.Tithe,
  SundayOffering: OfferingType.SundayOffering,
  SpecialOffering: OfferingType.SpecialOffering,
  Thanksgiving: OfferingType.Thanksgiving,
  Mission: OfferingType.Mission,
  BuildingFund: OfferingType.BuildingFund,
  Seed: OfferingType.Seed,
};

/**
 * Repli local si l'API des catégories est indisponible ou vide (paramètres non
 * semés). Mêmes codes que la migration backend 011 → les lignes restent
 * enregistrables et le total se calcule quand même.
 */
const DEFAULT_OFFERING_CATEGORIES: OfferingCategoryOption[] = [
  { code: 'Tithe', label: 'Dîmes', sortOrder: 1 },
  { code: 'SundayOffering', label: 'Offrandes ordinaires', sortOrder: 2 },
  { code: 'SpecialOffering', label: 'Offrandes spéciales', sortOrder: 3 },
  { code: 'Thanksgiving', label: 'Actions de grâce', sortOrder: 4 },
  { code: 'Donation', label: 'Dons', sortOrder: 5 },
  { code: 'Mission', label: 'Missions', sortOrder: 6 },
  { code: 'BuildingFund', label: 'Construction', sortOrder: 7 },
  { code: 'FirstFruits', label: 'Prémices', sortOrder: 8 },
  { code: 'Vow', label: 'Vœux', sortOrder: 9 },
  { code: 'Sacrifice', label: 'Sacrifice', sortOrder: 10 },
];

@Component({
  selector: 'app-offering-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AuthImageDirective, FormGuide, UploadField, MemberSelect],
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
  private permissions = inject(Permissions);
  private tokenService = inject(Token);
  private currencyService = inject(CurrencyService);

  /** Guide d'utilisation affiché en tête de formulaire (instructions + progression). */
  readonly guideSteps: GuideStep[] = [
    { icon: 'bx-list-check', tone: 'info', text: 'Choisissez l\'église et le site concernés.' },
    { icon: 'bx-calendar-event', tone: 'primary', text: 'Sélectionnez obligatoirement le culte associé (seuls les cultes que vous avez enregistrés sont proposés).' },
    { icon: 'bx-coin-stack', tone: 'success', text: 'Saisissez le montant global puis le détail par catégorie : les deux doivent concorder.' },
    { icon: 'bx-shield-quarter', tone: 'warning', text: 'Joignez la photo justificative si vous êtes habilité à valider les offrandes, puis enregistrez.' },
  ];

  /**
   * 🔒 `POST /Offering/{id}/upload-validation-photo` exige
   * CAN_VALIDATE_OFFERING : un créateur sans droit de validation ne doit pas
   * pouvoir téléverser la pièce justificative.
   */
  canUploadValidationPhoto(): boolean {
    return this.permissions.hasPermission('Finance_Offering_Validate');
  }

  readonly imageLimits = IMAGE_FILE_LIMITS;

  /** Reçoit le fichier validé par le champ d'upload réutilisable. */
  onValidationPhotoFile(file: File): void {
    this.handleFile(file);
  }

  // ── Exposé des énumérations au template ──
  readonly OfferingType = OfferingType;
  readonly OfferingStatus = OfferingStatus;
  readonly PaymentMethod = PaymentMethod;
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

  // ── Liste des cultes (select box) — limitée aux cultes créés par l'utilisateur ──
  services = signal<ServiceModel[]>([]);
  loadingServices = signal(false);

  // ── Photo justificative ──
  photoPreview = signal<string | null>(null);
  selectedPhotoFile: File | null = null;

  // ── Offrande par catégorie (catégories issues des Paramètres) ──
  offeringCategoryOptions = signal<OfferingCategoryOption[]>([]);
  loadingCategories = signal(false);
  categoryLines = signal<{ code: string; label: string; amount: number }[]>([]);
  // ── Devise (RG-CURR-02/03) : sélecteur + contre-valeur temps réel en XOF ──
  currencies = signal<CurrencyCatalogItem[]>([]);
  selectedCurrency = signal<string>('XOF');
  readonly currencyRate = computed(
    () => this.currencies().find((c) => c.codeIso === this.selectedCurrency())?.exchangeRateToXOF ?? 1
  );
  readonly isForeignCurrency = computed(() => this.selectedCurrency() !== 'XOF');

  /** Contre-valeur en FCFA (XOF) d'un montant saisi dans la devise sélectionnée. */
  xofEquivalent(value: number): number {
    return Math.round((Number(value) || 0) * this.currencyRate());
  }

  /** Montant global saisi. */
  private globalAmount = signal(0);
  /** Somme des lignes de catégorie. */
  linesTotal = computed(() =>
    this.categoryLines().reduce((sum, l) => sum + (Number(l.amount) || 0), 0)
  );
  /**
   * Incohérence : un montant global ET un détail par catégorie sont saisis mais
   * ne concordent pas. Bloque l'enregistrement (anti « fausses valeurs »).
   */
  amountMismatch = computed(() => {
    const lines = this.linesTotal();
    const amount = this.globalAmount();
    return lines > 0 && amount > 0 && amount !== lines;
  });

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
      type: [OfferingType.Other],
      // Le montant global est calculé à partir des lignes ; il n'est plus obligatoire.
      amount: [0],
      currency: ['XOF', Validators.required],
      date: ['', Validators.required],
      memberId: [''],
      memberSearch: [''],
      churchId: ['', Validators.required],
      siteId: [''],
      serviceId: ['', Validators.required],
      paymentMethod: [PaymentMethod.Cash, Validators.required],
      reference: [''],
      notes: [''],
      status: [OfferingStatus.Pending],
      // ✅ Nouveaux champs
      categories: [[]],
      validationPhotoUrl: [''],
    });
  }

  ngOnInit(): void {
    this.loadChurches();
    this.loadCategories();
    this.loadUserServices();
    this.loadCurrencies();

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

    // ── Montant global (total de repli tant qu'aucune ligne de catégorie n'est remplie) ──
    this.globalAmount.set(Number(this.form.get('amount')?.value) || 0);
    this.form.get('amount')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((v) => this.globalAmount.set(Number(v) || 0));

    // ── Devise sélectionnée (contre-valeur XOF temps réel) ──
    this.selectedCurrency.set(this.form.get('currency')?.value || 'XOF');
    this.form.get('currency')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((c) => this.selectedCurrency.set(c || 'XOF'));

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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ──────────────────────────────────────────────────────────────
  // OFFRANDE PAR CATÉGORIE
  // ──────────────────────────────────────────────────────────────

  private loadCategories(): void {
    this.loadingCategories.set(true);
    this.offeringsService.getCategories().subscribe({
      next: (res) => {
        const options = res?.data?.length ? res.data : DEFAULT_OFFERING_CATEGORIES;
        this.applyCategoryOptions(options);
        this.loadingCategories.set(false);
      },
      error: () => {
        // Catégories optionnelles : on retombe sur la liste par défaut pour que
        // le détail par catégorie et le total restent utilisables.
        this.applyCategoryOptions(DEFAULT_OFFERING_CATEGORIES);
        this.loadingCategories.set(false);
      },
    });
  }

  /** Charge le catalogue des devises actives (XOF par défaut). RG-CURR-02/03. */
  private loadCurrencies(): void {
    this.currencyService.getCatalog().subscribe({
      next: (res) => this.currencies.set(res?.data?.length ? res.data : this.defaultCurrencies()),
      error: () => this.currencies.set(this.defaultCurrencies()),
    });
  }

  private defaultCurrencies(): CurrencyCatalogItem[] {
    return [
      { codeIso: 'XOF', label: 'Franc CFA (XOF)', decimals: 0, exchangeRateToXOF: 1, isActive: true, isReference: true },
      { codeIso: 'GNF', label: 'Franc guinéen (GNF)', decimals: 0, exchangeRateToXOF: 1, isActive: true, isReference: false },
      { codeIso: 'EUR', label: 'Euro (EUR)', decimals: 2, exchangeRateToXOF: 1, isActive: true, isReference: false },
      { codeIso: 'USD', label: 'Dollar US (USD)', decimals: 2, exchangeRateToXOF: 1, isActive: true, isReference: false },
    ];
  }

  /** Montants de lignes issus de l'offrande éditée, en attente des catégories. */
  private pendingLineAmounts: Record<string, number> = {};

  private applyCategoryOptions(options: OfferingCategoryOption[]): void {
    const sorted = [...options].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    this.offeringCategoryOptions.set(sorted);
    const existing = this.categoryLines();
    this.categoryLines.set(
      sorted.map((o) => {
        const found = existing.find((l) => l.code === o.code);
        return { code: o.code, label: o.label, amount: found?.amount ?? this.pendingLineAmounts[o.code] ?? 0 };
      })
    );
  }

  updateLineAmount(code: string, value: string): void {
    const amount = Number(value) || 0;
    this.pendingLineAmounts[code] = amount;
    this.categoryLines.update((list) =>
      list.map((l) => (l.code === code ? { ...l, amount } : l))
    );
  }

  /** Reporte les lignes d'une offrande existante sur les champs de catégorie. */
  private applyOfferingLines(lines: any[] | undefined): void {
    if (!Array.isArray(lines) || lines.length === 0) return;
    for (const l of lines) {
      const code = l?.categoryId ?? l?.code;
      if (!code) continue;
      this.pendingLineAmounts[code] = Number(l?.amount) || 0;
    }
    this.categoryLines.update((list) =>
      list.map((l) =>
        this.pendingLineAmounts[l.code] !== undefined
          ? { ...l, amount: this.pendingLineAmounts[l.code] }
          : l
      )
    );
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
      paymentMethod: offering.paymentMethod || PaymentMethod.Cash,
      reference: offering.reference || '',
      notes: offering.notes || '',
      status: offering.status || OfferingStatus.Pending,
      // ✅ Nouveaux champs
      categories: offering.categories || [],
      validationPhotoUrl: offering.validationPhotoUrl || '',
    });

    // Pré-remplir les lignes de catégorie à partir de l'offrande éditée.
    this.applyOfferingLines(offering.lines);

    // Si membre existe, le sélectionner
    if (offering.memberId) {
      this.selectedMember.set({
        id: offering.memberId,
        firstName: offering.memberName?.split(' ')[0] || '',
        lastName: offering.memberName?.split(' ')[1] || '',
        fullName: offering.memberName || '',
      } as any as Member);
    }

    // Charger les sites pour l'église sélectionnée
    if (offering.churchId) {
      this.loadSites(offering.churchId);
    }

    // En édition, garantir que le culte de l'offrande figure bien dans la liste.
    if (offering.serviceId) {
      this.ensureServiceInList(offering.serviceId, offering.serviceTitle);
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

  // ─── CULTES ENREGISTRÉS PAR L'UTILISATEUR (select box) ─────

  private loadUserServices(): void {
    this.loadingServices.set(true);
    const userId = this.tokenService.getUserId();
    this.serviceService
      .getAll({ page: 1, pageSize: 200, createdBy: userId ?? undefined, sortBy: 'date', sortOrder: 'desc' } as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const items = (response?.data?.items ?? (response as any)?.items ?? []) as ServiceModel[];
          this.services.set(items);
          this.loadingServices.set(false);
        },
        error: () => {
          this.services.set([]);
          this.loadingServices.set(false);
        },
      });
  }

  /** Garantit la présence du culte de l'offrande dans la liste (mode édition). */
  private ensureServiceInList(serviceId: string, fallbackTitle?: string): void {
    if (this.services().some((s) => s.id === serviceId)) return;
    this.serviceService.getById(serviceId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        const svc = response?.data as unknown as ServiceModel | undefined;
        if (svc) this.services.update((list) => [svc, ...list]);
      },
      error: () => {
        if (fallbackTitle) {
          this.services.update((list) => [
            { id: serviceId, title: fallbackTitle, formattedDate: '' } as any as ServiceModel,
            ...list,
          ]);
        }
      },
    });
  }

  /** Libellé lisible d'un culte dans le select : date · titre · site · statut. */
  getServiceOptionLabel(s: ServiceModel): string {
    const date = s.formattedDate ||
      (s.date
        ? new Date(s.date).toLocaleString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
          })
        : '');
    return [date, s.title, s.siteName, s.statusLabel].filter(Boolean).join(' · ');
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

    // Détail par catégorie : le montant global est la SOMME des lignes.
    const lines: OfferingLinePayload[] = this.categoryLines()
      .filter((l) => Number(l.amount) > 0)
      .map((l) => ({ categoryId: l.code, amount: Number(l.amount) }));

    // Anti « fausses valeurs » : le montant global doit concorder avec le détail.
    if (this.amountMismatch()) {
      this.saving.set(false);
      this.error.set(
        `Le montant global (${this.globalAmount()}) ne correspond pas au total du détail (${this.linesTotal()}).`
      );
      return;
    }

    const computedAmount = lines.length > 0
      ? lines.reduce((sum, l) => sum + l.amount, 0)
      : Number(raw.amount) || 0;

    if (computedAmount <= 0) {
      this.saving.set(false);
      this.error.set('Saisissez un montant global ou son détail par catégorie.');
      return;
    }

    // Le type n'est plus choisi manuellement : il est déduit de la ligne la
    // plus élevée (compatibilité), sinon « Autre ». Les tableaux de bord
    // s'appuient désormais sur les LIGNES (catégories), pas sur ce champ.
    const dominant = this.categoryLines()
      .filter((l) => Number(l.amount) > 0)
      .sort((a, b) => Number(b.amount) - Number(a.amount))[0];
    const derivedType = dominant ? (CATEGORY_TO_TYPE[dominant.code] ?? OfferingType.Other) : (raw.type ?? OfferingType.Other);

    const payload: OfferingCreate | OfferingUpdate = {
      type: derivedType,
      amount: computedAmount,
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
      // Plus de sélection de catégories : le détail vit dans les lignes.
      categories: [],
      validationPhotoUrl: raw.validationPhotoUrl || '',
      lines,
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
          // 🔒 l'upload exige Finance_Offering_Validate côté backend
          if (this.selectedPhotoFile && this.canUploadValidationPhoto()) {
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
