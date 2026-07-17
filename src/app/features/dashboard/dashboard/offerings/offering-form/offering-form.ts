// src/app/features/dashboard/finances/offerings/offering-form/offering-form.component.ts

import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { Members } from '../../../../../core/services/Members/members';
import { Church as ChurchService } from '../../../../../core/services/Church/church';
import { Users } from '../../../../../core/services/Users/users';
import { Roles } from '../../../../../core/services/Roles/roles';

import { OfferingType, OfferingStatus, OfferingCreate, OfferingUpdate } from '../../../../../core/models/Finances/offering.model';
import { OfferingTypeLabels, OfferingTypeIcons } from '../../../../../core/models/Finances/offering.model';
import { Church as ChurchModel } from '../../../../../core/models/Church/church.model';
import { Site } from '../../../../../core/models/Church/site.model';
import { Member } from '../../../../../core/models/Members/member.model';
import { User } from '../../../../../core/models/Users/user.model';
import { PaymentMethod } from '../../../../../core/models/Finances/expense.model';
import { Offerings } from '../../../../../core/services/Finances/offerings';

const TYPE_OPTIONS = Object.values(OfferingType).map((value) => ({
  value,
  label: OfferingTypeLabels[value],
  icon: OfferingTypeIcons[value],
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
  private router = inject(Router);

  // ── Exposé des énumérations au template ──
  readonly OfferingType = OfferingType;
  readonly OfferingStatus = OfferingStatus;
  readonly PaymentMethod = PaymentMethod;
  readonly typeOptions = TYPE_OPTIONS;
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

  // ── Recherche de service (cultes) ──
  // Optionnel : si vous voulez lier l'offrande à un culte
  // services = signal<Service[]>([]);
  // searchingService = signal(false);
  // showServiceResults = signal(false);
  // serviceResults = signal<Service[]>([]);
  // selectedService = signal<Service | null>(null);

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
      paymentMethod: [PaymentMethod.Cash, Validators.required],
      reference: [''],
      notes: [''],
      status: [OfferingStatus.Pending],
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
      paymentMethod: offering.paymentMethod || PaymentMethod.Cash,
      reference: offering.reference || '',
      notes: offering.notes || '',
      status: offering.status || OfferingStatus.Pending,
    });

    // Si membre existe, le sélectionner
    if (offering.memberId) {
      // On peut charger le membre si nécessaire, ou simplement afficher le nom
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

  // ──────────────────────────────────────────────────────────────
  // RECHERCHE DE MEMBRE
  // ──────────────────────────────────────────────────────────────

  private searchMembers(term: string): void {
    this.searchingMember.set(true);
    this.showMemberResults.set(true);

    this.memberService
      .getMembers({ page: 1, pageSize: 8, fullName: term } as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.memberResults.set((response.data as any).items || []);
          } else {
            this.memberResults.set([]);
          }
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
    };

    const request$ = this.isEditMode() && this.offeringId
      ? this.offeringsService.update(this.offeringId, payload)
      : this.offeringsService.create(payload as OfferingCreate);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.saving.set(false);
        if (response.success && response.data) {
          this.success.set(true);
          setTimeout(() => {
            this.success.set(false);
            this.router.navigate(['/dashboard/offrandes', response.data.id]);
          }, 1000);
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
