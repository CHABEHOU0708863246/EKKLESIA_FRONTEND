import { Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CellGroup } from '../../../../../core/models/Members/cell-group.model';
import {
  Member,
  MemberCreate as MemberCreatePayload,
  DEFAULT_MEMBER_FILTER,
} from '../../../../../core/models/Members/member.model';
import { Members } from '../../../../../core/services/Members/members';

interface WizardStep {
  id: 'identite' | 'statut' | 'affectation' | 'recap';
  label: string;
  shortLabel: string;
  icon: string;
  color: string; // couleur "vitrail" associée au panneau
}

const STATUS_OPTIONS = [
  { value: 'Visitor', label: 'Visiteur' },
  { value: 'Adherent', label: 'Adhérent' },
  { value: 'Active', label: 'Actif' },
  { value: 'Inactive', label: 'Inactif' },
  { value: 'ExMember', label: 'Ancien membre' },
];

const SPIRITUAL_STATUS_OPTIONS = [
  { value: 'NonBeliever', label: 'Non converti' },
  { value: 'Catechumen', label: 'Catéchumène' },
  { value: 'Believer', label: 'Croyant' },
  { value: 'Baptized', label: 'Baptisé(e)' },
  { value: 'Disciple', label: 'Disciple' },
  { value: 'Leader', label: 'Leader' },
];

const GENDER_OPTIONS = [
  { value: 'M', label: 'Homme' },
  { value: 'F', label: 'Femme' },
];

@Component({
  selector: 'app-member-create',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './member-create.html',
  styleUrl: './member-create.scss',
})
export class MemberCreate implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private godfatherSearch$ = new Subject<string>();

  readonly statusOptions = STATUS_OPTIONS;
  readonly spiritualStatusOptions = SPIRITUAL_STATUS_OPTIONS;
  readonly genderOptions = GENDER_OPTIONS;

  readonly steps: WizardStep[] = [
    { id: 'identite', label: 'Identité & contact', shortLabel: 'Identité', icon: 'user', color: 'violet' },
    { id: 'statut', label: 'Statut spirituel', shortLabel: 'Statut', icon: 'flame', color: 'gold' },
    { id: 'affectation', label: 'Affectation', shortLabel: 'Cellule', icon: 'link', color: 'sapphire' },
    { id: 'recap', label: 'Récapitulatif', shortLabel: 'Résumé', icon: 'check', color: 'emerald' },
  ];

  currentStepIndex = signal(0);
  isSubmitting = signal(false);
  submitError = signal<string | null>(null);
  submitSuccess = signal(false);

  cellGroups: CellGroup[] = [];
  loadingCellGroups = signal(false);

  godfatherResults: Member[] = [];
  searchingGodfather = signal(false);
  selectedGodfather: Member | null = null;
  showGodfatherResults = signal(false);

  form: FormGroup;

  currentStep = computed(() => this.steps[this.currentStepIndex()]);
  progressPercent = computed(() => ((this.currentStepIndex() + 1) / this.steps.length) * 100);
  isLastStep = computed(() => this.currentStepIndex() === this.steps.length - 1);
  isFirstStep = computed(() => this.currentStepIndex() === 0);

  constructor(
    private fb: FormBuilder,
    private memberService: Members,
    private router: Router
  ) {
    this.form = this.fb.group({
      identite: this.fb.group({
        gender: [''],
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        lastName: ['', [Validators.required, Validators.minLength(2)]],
        phone: ['', [Validators.required, Validators.pattern(/^[0-9+\s]{8,15}$/)]],
        email: ['', [Validators.email]],
        birthDate: [''],
      }),
      statut: this.fb.group({
        status: ['Visiteur', Validators.required],
        spiritualStatus: ['NonConverti', Validators.required],
        isBaptized: [false],
        baptizedDate: [''],
        isLeader: [false],
      }),
      affectation: this.fb.group({
        cellGroupId: [''],
        ministryId: [''],
        godfatherId: [''],
      }),
      notes: [''],
    });
  }

  ngOnInit(): void {
    this.loadCellGroups();

    this.godfatherSearch$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => this.performGodfatherSearch(term));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT DES DONNÉES LIÉES
  // ───────────────────────────────────────────────────────────────

  private loadCellGroups(): void {
    this.loadingCellGroups.set(true);
    this.memberService
      .getCellGroups(undefined, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (groups) => {
          this.cellGroups = groups ?? [];
          this.loadingCellGroups.set(false);
          console.log('✅ Cellules chargées:', this.cellGroups.length);
        },
        error: (error) => {
          console.warn('⚠️ Impossible de charger les cellules:', error);
          this.cellGroups = [];
          this.loadingCellGroups.set(false);
        },
      });
  }

  onGodfatherInput(term: string): void {
    if (this.selectedGodfather && term !== this.selectedGodfather.fullName) {
      this.selectedGodfather = null;
      this.affectationGroup.get('godfatherId')?.setValue('');
    }
    if (term.trim().length < 2) {
      this.godfatherResults = [];
      this.showGodfatherResults.set(false);
      return;
    }
    this.godfatherSearch$.next(term.trim());
  }

  private performGodfatherSearch(term: string): void {
    this.searchingGodfather.set(true);
    this.showGodfatherResults.set(true);
    this.memberService
      .getMembers({ ...DEFAULT_MEMBER_FILTER, fullName: term, pageSize: 6 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.godfatherResults = res?.items ?? (res as any) ?? [];
          this.searchingGodfather.set(false);
        },
        error: (error) => {
          console.warn('⚠️ Recherche parrain/marraine indisponible:', error);
          this.godfatherResults = [];
          this.searchingGodfather.set(false);
        },
      });
  }

  selectGodfather(member: Member): void {
    this.selectedGodfather = member;
    this.affectationGroup.get('godfatherId')?.setValue(member.id ?? (member as any).id);
    this.showGodfatherResults.set(false);
  }

  clearGodfather(): void {
    this.selectedGodfather = null;
    this.affectationGroup.get('godfatherId')?.setValue('');
    this.godfatherResults = [];
  }

  // ───────────────────────────────────────────────────────────────
  // GETTERS DE GROUPES
  // ───────────────────────────────────────────────────────────────

  get identiteGroup(): FormGroup {
    return this.form.get('identite') as FormGroup;
  }
  get statutGroup(): FormGroup {
    return this.form.get('statut') as FormGroup;
  }
  get affectationGroup(): FormGroup {
    return this.form.get('affectation') as FormGroup;
  }

  isFieldInvalid(group: FormGroup, field: string): boolean {
    const control = group.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  // ───────────────────────────────────────────────────────────────
  // NAVIGATION DU WIZARD
  // ───────────────────────────────────────────────────────────────

  isStepValid(index: number): boolean {
    const step = this.steps[index];
    if (step.id === 'identite') return this.identiteGroup.valid;
    if (step.id === 'statut') return this.statutGroup.valid;
    return true;
  }

  goToStep(index: number): void {
    if (index < 0 || index >= this.steps.length) return;
    // On autorise à reculer librement, mais on bloque l'avancée si l'étape courante est invalide
    if (index > this.currentStepIndex()) {
      for (let i = this.currentStepIndex(); i < index; i++) {
        if (!this.isStepValid(i)) {
          this.markStepTouched(i);
          return;
        }
      }
    }
    this.currentStepIndex.set(index);
    this.scrollContentTop();
  }

  next(): void {
    if (!this.isStepValid(this.currentStepIndex())) {
      this.markStepTouched(this.currentStepIndex());
      return;
    }
    if (!this.isLastStep()) {
      this.currentStepIndex.update((i) => i + 1);
      this.scrollContentTop();
    }
  }

  previous(): void {
    if (!this.isFirstStep()) {
      this.currentStepIndex.update((i) => i - 1);
      this.scrollContentTop();
    }
  }

  private markStepTouched(index: number): void {
    const step = this.steps[index];
    const group = step.id === 'identite' ? this.identiteGroup : step.id === 'statut' ? this.statutGroup : null;
    group?.markAllAsTouched();
  }

  private scrollContentTop(): void {
    document.querySelector('.mc-content')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ───────────────────────────────────────────────────────────────
  // SOUMISSION
  // ───────────────────────────────────────────────────────────────

  submit(): void {
    if (this.identiteGroup.invalid || this.statutGroup.invalid) {
      this.identiteGroup.markAllAsTouched();
      this.statutGroup.markAllAsTouched();
      this.currentStepIndex.set(this.identiteGroup.invalid ? 0 : 1);
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    try {
      const payload = this.buildPayload();

      this.memberService
        .createMember(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (created) => {
            console.log('✅ Membre créé avec succès:', created?.fullName ?? created);
            this.isSubmitting.set(false);
            this.submitSuccess.set(true);
            setTimeout(() => this.router.navigate(['/dashboard/membres']), 1400);
          },
          error: (error) => {
            console.error('❌ Erreur lors de la création du membre:', error);
            this.isSubmitting.set(false);
            this.submitError.set(
              error?.error?.message ??
                "Une erreur est survenue lors de l'enregistrement. Veuillez réessayer."
            );
          },
        });
    } catch (error) {
      console.error('❌ Erreur inattendue lors de la préparation du formulaire:', error);
      this.isSubmitting.set(false);
      this.submitError.set('Une erreur inattendue est survenue.');
    }
  }

  private buildPayload(): MemberCreatePayload {
    const identite = this.identiteGroup.value;
    const statut = this.statutGroup.value;
    const affectation = this.affectationGroup.value;
    const notes = this.form.get('notes')?.value;

    return {
      gender: identite.gender || undefined,
      firstName: identite.firstName,
      lastName: identite.lastName,
      phone: identite.phone,
      email: identite.email || undefined,
      birthDate: identite.birthDate || undefined,
      status: statut.status,
      spiritualStatus: statut.spiritualStatus,
      isBaptized: statut.isBaptized,
      baptizedDate: statut.isBaptized ? statut.baptizedDate || undefined : undefined,
      isLeader: statut.isLeader,
      cellGroupId: affectation.cellGroupId || undefined,
      ministryId: affectation.ministryId || undefined,
      godfatherId: affectation.godfatherId || undefined,
      notes: notes || undefined,
    } as unknown as MemberCreatePayload;
  }

  resetForm(): void {
    this.form.reset({
      identite: { gender: '', firstName: '', lastName: '', phone: '', email: '', birthDate: '' },
      statut: { status: 'Visiteur', spiritualStatus: 'NonConverti', isBaptized: false, baptizedDate: '', isLeader: false },
      affectation: { cellGroupId: '', ministryId: '', godfatherId: '' },
      notes: '',
    });
    this.selectedGodfather = null;
    this.submitSuccess.set(false);
    this.submitError.set(null);
    this.currentStepIndex.set(0);
  }

  getCellGroupName(id: string | undefined | null): string {
    if (!id) return 'Aucune';
    return this.cellGroups.find((c) => c.id === id)?.name ?? 'Aucune';
  }

  getInitials(firstName: string, lastName: string): string {
    return `${(firstName || '?').charAt(0)}${(lastName || '?').charAt(0)}`.toUpperCase();
  }
}
