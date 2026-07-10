// src/app/features/dashboard/dashboard/members/member-detail/member-detail.ts
import { Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { CellGroup } from '../../../../../core/models/Members/cell-group.model';
import { Member } from '../../../../../core/models/Members/member.model';
import { PastoralNote } from '../../../../../core/models/Members/pastoral-note.model';
import { Members } from '../../../../../core/services/Members/members';
import { ConfirmDialog } from '../../../../../core/components/confirm-dialog/confirm-dialog';

// ── Libellés français pour les enums backend ──
const STATUS_LABELS: Record<string, string> = {
  Visitor: 'Visiteur',
  Adherent: 'Adhérent',
  Active: 'Actif',
  Inactive: 'Inactif',
  ExMember: 'Ancien membre',
};

const SPIRITUAL_STATUS_OPTIONS = [
  { value: 'NonBeliever', label: 'Non converti' },
  { value: 'Catechumen', label: 'Catéchumène' },
  { value: 'Believer', label: 'Croyant' },
  { value: 'Baptized', label: 'Baptisé(e)' },
  { value: 'Disciple', label: 'Disciple' },
  { value: 'Leader', label: 'Leader' },
];

const STATUS_OPTIONS = [
  { value: 'Visitor', label: 'Visiteur' },
  { value: 'Adherent', label: 'Adhérent' },
  { value: 'Active', label: 'Actif' },
  { value: 'Inactive', label: 'Inactif' },
  { value: 'ExMember', label: 'Ancien membre' },
];

const GENDER_OPTIONS = [
  { value: 'M', label: 'Homme' },
  { value: 'F', label: 'Femme' },
];

// ── Parcours du visiteur, dans l'ordre ──
const VISITOR_STAGE_ORDER = ['FirstContact', 'Invited', 'InClass', 'Adhered'] as const;
type VisitorStageKey = (typeof VISITOR_STAGE_ORDER)[number];

const VISITOR_STAGE_LABELS: Record<VisitorStageKey, string> = {
  FirstContact: '1er contact',
  Invited: 'Invitation',
  InClass: 'Cours',
  Adhered: 'Adhésion',
};

@Component({
  selector: 'app-member-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, ConfirmDialog],
  templateUrl: './member-detail.html',
  styleUrl: './member-detail.scss',
})
export class MemberDetail implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private memberId = '';
  private godfatherSearch$ = new Subject<string>();

  readonly statusOptions = STATUS_OPTIONS;
  readonly spiritualStatusOptions = SPIRITUAL_STATUS_OPTIONS;
  readonly genderOptions = GENDER_OPTIONS;
  readonly visitorStageOrder = VISITOR_STAGE_ORDER;
  readonly visitorStageLabels = VISITOR_STAGE_LABELS;

  member = signal<Member | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  isEditMode = signal(false);
  saving = signal(false);
  saveError = signal<string | null>(null);
  saveSuccess = signal(false);

  cellGroups = signal<CellGroup[]>([]);
  godfather = signal<Member | null>(null);

  godfatherResults: Member[] = [];
  searchingGodfather = signal(false);
  showGodfatherResults = signal(false);
  selectedGodfather: Member | null = null;

  pastoralNotes = signal<PastoralNote[]>([]);
  loadingNotes = signal(false);

  advancingStage = signal(false);

  deleteDialogVisible = signal(false);
  deleting = signal(false);

  form: FormGroup;

  currentStageIndex = computed(() => {
    const m = this.member();
    if (!m || !(m as any).visitorStage) return -1;
    return VISITOR_STAGE_ORDER.indexOf((m as any).visitorStage as VisitorStageKey);
  });

  nextStageLabel = computed(() => {
    const idx = this.currentStageIndex();
    if (idx < 0 || idx >= VISITOR_STAGE_ORDER.length - 1) return null;
    return VISITOR_STAGE_LABELS[VISITOR_STAGE_ORDER[idx + 1]];
  });

  isVisitorPipelineDone = computed(() => this.currentStageIndex() === VISITOR_STAGE_ORDER.length - 1);

  constructor(
    private fb: FormBuilder,
    private memberService: Members,
    private route: ActivatedRoute,
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
        status: ['Visitor', Validators.required],
        spiritualStatus: ['NonBeliever', Validators.required],
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
    this.memberId = this.route.snapshot.paramMap.get('id') ?? '';
    const urlSegments = this.route.snapshot.url.map((s) => s.path);
    this.isEditMode.set(urlSegments.includes('edit'));

    this.loadCellGroups();
    this.loadMember();

    this.godfatherSearch$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => this.performGodfatherSearch(term));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT
  // ───────────────────────────────────────────────────────────────

  private loadMember(): void {
    if (!this.memberId) {
      this.error.set('Identifiant de membre invalide.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.memberService
      .getMemberById(this.memberId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (member) => {
          this.member.set(member);
          this.populateForm(member);
          this.loading.set(false);

          const godfatherId = (member as any).godfatherId;
          if (godfatherId) this.loadGodfather(godfatherId);

          this.loadPastoralNotes();
        },
        error: (err) => {
          console.error('❌ Erreur lors du chargement du membre:', err);
          this.error.set("Impossible de charger la fiche de ce membre.");
          this.loading.set(false);
        },
      });
  }

  private loadCellGroups(): void {
    this.memberService
      .getCellGroups(undefined, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (groups) => this.cellGroups.set(groups ?? []),
        error: () => this.cellGroups.set([]),
      });
  }

  private loadGodfather(id: string): void {
    this.memberService
      .getMemberById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (m) => {
          this.godfather.set(m);
          this.selectedGodfather = m;
        },
        error: () => this.godfather.set(null),
      });
  }

  private loadPastoralNotes(): void {
    this.loadingNotes.set(true);
    this.memberService
      .getPastoralNotesByMember(this.memberId, false)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notes) => {
          this.pastoralNotes.set((notes ?? []).slice(0, 3));
          this.loadingNotes.set(false);
        },
        error: () => {
          this.pastoralNotes.set([]);
          this.loadingNotes.set(false);
        },
      });
  }

  private populateForm(member: Member): void {
    const m = member as any;
    this.form.patchValue({
      identite: {
        gender: m.gender ?? '',
        firstName: m.firstName ?? '',
        lastName: m.lastName ?? '',
        phone: m.phone ?? '',
        email: m.email ?? '',
        birthDate: this.toDateInputValue(m.dateOfBirth),
      },
      statut: {
        status: m.status ?? 'Visitor',
        spiritualStatus: m.spiritualStatus ?? 'NonBeliever',
        isBaptized: !!m.isBaptized,
        baptizedDate: this.toDateInputValue(m.baptismDate),
        isLeader: !!m.isLeader,
      },
      affectation: {
        cellGroupId: m.cellGroupId ?? '',
        ministryId: m.ministryIds?.[0] ?? '',
        godfatherId: m.godfatherId ?? '',
      },
      notes: '',
    }, { emitEvent: false });
  }

  private toDateInputValue(date: string | Date | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }

  // ───────────────────────────────────────────────────────────────
  // MODE ÉDITION
  // ───────────────────────────────────────────────────────────────

  enterEditMode(): void {
    this.isEditMode.set(true);
    this.saveError.set(null);
    this.router.navigate(['/dashboard/membres', this.memberId, 'edit']);
  }

  cancelEditMode(): void {
    const m = this.member();
    if (m) this.populateForm(m);
    this.isEditMode.set(false);
    this.saveError.set(null);
    this.router.navigate(['/dashboard/membres', this.memberId]);
  }

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

  save(): void {
    if (this.identiteGroup.invalid || this.statutGroup.invalid) {
      this.identiteGroup.markAllAsTouched();
      this.statutGroup.markAllAsTouched();
      this.saveError.set('Veuillez corriger les champs invalides avant d’enregistrer.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    const identite = this.identiteGroup.value;
    const statut = this.statutGroup.value;
    const affectation = this.affectationGroup.value;

    const payload = {
      gender: identite.gender || undefined,
      firstName: identite.firstName,
      lastName: identite.lastName,
      phone: identite.phone,
      email: identite.email || undefined,
      dateOfBirth: identite.birthDate || undefined,
      status: statut.status,
      spiritualStatus: statut.spiritualStatus,
      isBaptized: statut.isBaptized,
      baptismDate: statut.isBaptized ? statut.baptizedDate || undefined : undefined,
      isLeader: statut.isLeader,
      cellGroupId: affectation.cellGroupId || undefined,
      ministryIds: affectation.ministryId ? [affectation.ministryId] : [],
      godfatherId: affectation.godfatherId || undefined,
    };

    this.memberService
      .updateMember(this.memberId, payload as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.member.set(updated);
          this.saving.set(false);
          this.saveSuccess.set(true);
          this.isEditMode.set(false);
          this.router.navigate(['/dashboard/membres', this.memberId]);
          setTimeout(() => this.saveSuccess.set(false), 3000);
        },
        error: (err) => {
          console.error('❌ Erreur lors de la mise à jour:', err);
          this.saving.set(false);
          this.saveError.set(
            err?.error?.errors
              ? "Certaines informations sont invalides. Vérifiez le formulaire."
              : "Une erreur est survenue lors de l'enregistrement."
          );
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // PARRAIN / MARRAINE (recherche, en mode édition)
  // ───────────────────────────────────────────────────────────────

  onGodfatherInput(term: string): void {
    if (this.selectedGodfather && term !== this.getFullName(this.selectedGodfather)) {
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
      .getMembers({ page: 1, pageSize: 6, fullName: term } as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.godfatherResults = ((res as any)?.items ?? (res as any) ?? []).filter(
            (m: any) => m.id !== this.memberId
          );
          this.searchingGodfather.set(false);
        },
        error: () => {
          this.godfatherResults = [];
          this.searchingGodfather.set(false);
        },
      });
  }

  selectGodfather(member: Member): void {
    this.selectedGodfather = member;
    this.affectationGroup.get('godfatherId')?.setValue((member as any).id);
    this.showGodfatherResults.set(false);
  }

  clearGodfather(): void {
    this.selectedGodfather = null;
    this.affectationGroup.get('godfatherId')?.setValue('');
    this.godfatherResults = [];
  }

  // ───────────────────────────────────────────────────────────────
  // PARCOURS VISITEUR
  // ───────────────────────────────────────────────────────────────

  advanceVisitorStage(): void {
    const idx = this.currentStageIndex();
    if (idx < 0 || idx >= VISITOR_STAGE_ORDER.length - 1) return;

    const nextStage = VISITOR_STAGE_ORDER[idx + 1];
    this.advancingStage.set(true);

    this.memberService
      .updateVisitorStage(this.memberId, nextStage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.member.set(updated);
          this.advancingStage.set(false);
        },
        error: (err) => {
          console.error('❌ Erreur lors de la mise à jour du parcours:', err);
          this.advancingStage.set(false);
          this.error.set("Impossible de faire progresser ce visiteur.");
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // SUPPRESSION
  // ───────────────────────────────────────────────────────────────

  requestDelete(): void {
    this.deleteDialogVisible.set(true);
  }

  cancelDelete(): void {
    this.deleteDialogVisible.set(false);
  }

  confirmDelete(): void {
    this.deleting.set(true);
    this.memberService
      .deleteMember(this.memberId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.router.navigate(['/dashboard/membres']);
        },
        error: (err) => {
          console.error('❌ Erreur lors de la suppression:', err);
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.error.set('Impossible de supprimer ce membre.');
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // HELPERS D'AFFICHAGE
  // ───────────────────────────────────────────────────────────────

  getInitials(member: Member | null): string {
    if (!member) return '?';
    const f = (member as any).firstName ?? '?';
    const l = (member as any).lastName ?? '?';
    return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
  }

  getFullName(member: Member | null): string {
    if (!member) return '';
    return (member as any).fullName ?? `${(member as any).firstName} ${(member as any).lastName}`;
  }

  getStatusLabel(status: string | undefined): string {
    return status ? STATUS_LABELS[status] ?? status : '—';
  }

  getStatusClass(status: string | undefined): string {
    const map: Record<string, string> = {
      Visitor: 'is-visitor',
      Adherent: 'is-adherent',
      Active: 'is-active',
      Inactive: 'is-inactive',
      ExMember: 'is-exmember',
    };
    return status ? map[status] ?? '' : '';
  }

  getSpiritualStatusLabel(status: string | undefined): string {
    return SPIRITUAL_STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status ?? '—';
  }

  getCellGroupName(id: string | undefined | null): string {
    if (!id) return 'Aucune';
    return this.cellGroups().find((c) => (c as any).id === id)?.name ?? 'Aucune';
  }

  formatDate(date: string | Date | null | undefined): string {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }
}
