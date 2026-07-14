// src/app/features/dashboard/dashboard/pastoral-acts/pastoral-act-detail/pastoral-act-detail.ts
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, signal, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { PastoralActType, PastoralActTypeLabels, PastoralActTypeIcons } from '../../../../../core/models/PastoralAct/pastoral-act.enums';
import { PASTORAL_ACT_ROLES, PastoralActUtils } from '../../../../../core/models/PastoralAct/pastoral-act.models';
import { PastoralActResponseDto, PastoralActUpdateDto } from '../../../../../core/models/PastoralAct/pastoral-act.dtos';
import { PastoralActs } from '../../../../../core/services/PastoralAct/pastoral-acts';

import { Member } from '../../../../../core/models/Members/member.model';
import { Members } from '../../../../../core/services/Members/members';
import { User } from '../../../../../core/models/Users/user.model';
import { Users } from '../../../../../core/services/Users/users';
import { Roles } from '../../../../../core/services/Roles/roles';
import { Church as ChurchModel } from '../../../../../core/models/Church/church.model';
import { Church as ChurchService } from '../../../../../core/services/Church/church';
import { Site } from '../../../../../core/models/Church/site.model';
import { ConfirmDialog } from '../../../../../core/components/confirm-dialog/confirm-dialog';

const TYPE_OPTIONS = Object.values(PastoralActType).map((value) => ({
  value,
  label: PastoralActTypeLabels[value],
  icon: PastoralActTypeIcons[value],
}));

@Component({
  selector: 'app-pastoral-act-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, ConfirmDialog],
  templateUrl: './pastoral-act-detail.html',
  styleUrl: './pastoral-act-detail.scss',
})
export class PastoralActDetail implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private actId = '';

  readonly typeOptions = TYPE_OPTIONS;
  readonly PastoralActType = PastoralActType;

  act = signal<PastoralActResponseDto | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  isEditMode = signal(false);
  saving = signal(false);
  saveError = signal<string | null>(null);
  saveSuccess = signal(false);

  // ── Église / Site (édition) ──
  churches = signal<ChurchModel[]>([]);
  loadingChurches = signal(false);
  sites = signal<Site[]>([]);
  loadingSites = signal(false);

  // ── Officiant (recherche) ──
  officiantRoleNames = signal<string[]>([]);
  searchingOfficiant = signal(false);
  showOfficiantResults = signal(false);
  officiantResults = signal<User[]>([]);
  selectedOfficiant = signal<User | null>(null);

  // ── Participants (recherche par index) ──
  searchingParticipant = signal<number | null>(null);
  showParticipantResults = signal<number | null>(null);
  participantResults = signal<Member[]>([]);
  selectedParticipantMap = new Map<number, Member>();

  // ── Suppression ──
  deleteDialogVisible = signal(false);
  deleting = signal(false);

  // ── Certificat ──
  generatingCertificate = signal(false);

  form: FormGroup;

  selectedType = computed(() => this.form?.get('type')?.value as PastoralActType);

  availableRoles = computed((): string[] => {
  const type = this.selectedType();
  let roles: readonly string[];
  switch (type) {
    case PastoralActType.Baptism: roles = PASTORAL_ACT_ROLES.Baptism; break;
    case PastoralActType.Wedding: roles = PASTORAL_ACT_ROLES.Wedding; break;
    case PastoralActType.Funeral: roles = PASTORAL_ACT_ROLES.Funeral; break;
    case PastoralActType.ChildDedication: roles = PASTORAL_ACT_ROLES.ChildDedication; break;
    default: roles = PASTORAL_ACT_ROLES.Other; break;
  }
  return [...roles]; // ✅ conversion en string[] standard
});

  constructor(
    private fb: FormBuilder,
    private pastoralActService: PastoralActs,
    private memberService: Members,
    private userService: Users,
    private roleService: Roles,
    private churchService: ChurchService,
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.form = this.fb.group({
      type: [PastoralActType.Baptism, Validators.required],
      date: ['', Validators.required],
      location: [''],
      churchId: ['', Validators.required],
      siteId: [''],
      officiantId: ['', Validators.required],
      officiantSearch: [''],
      notes: [''],
      witnessesText: [''],
      participants: this.fb.array([]),
      details: this.fb.group({
        marriageRegime: [''],
        dateOfDeath: [''],
        burialLocation: [''],
        bibleVerse: [''],
        godparentsText: [''],
      }),
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.actId = this.route.snapshot.paramMap.get('id') ?? '';
    const urlSegments = this.route.snapshot.url.map((s) => s.path);
    this.isEditMode.set(urlSegments.includes('edit'));

    this.loadChurches();
    this.loadOfficiantRoleNames();
    this.loadAct();

    this.form.get('churchId')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((churchId: string) => this.loadSites(churchId));

    this.form.get('officiantSearch')?.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term: string) => {
        if (term && term.trim().length >= 2) {
          this.performOfficiantSearch(term.trim());
        } else {
          this.officiantResults.set([]);
          this.showOfficiantResults.set(false);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT
  // ───────────────────────────────────────────────────────────────

  private loadAct(): void {
    if (!this.actId) {
      this.error.set('Identifiant invalide.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.pastoralActService
      .getById(this.actId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
            // ✅ Vérifier que l'objet est valide (contient un id)
            if (response && response.id) {
              this.act.set(response);
              this.populateForm(response);
            } else {
              this.error.set('Impossible de charger cet acte pastoral.');
            }
            this.loading.set(false);
          },
        error: () => {
          this.error.set('Impossible de charger cet acte pastoral.');
          this.loading.set(false);
        },
      });
  }

  private populateForm(act: PastoralActResponseDto): void {
    this.form.patchValue({
      type: act.type,
      date: this.toDateInputValue(act.date),
      location: act.location ?? '',
      churchId: act.churchId,
      siteId: act.siteId ?? '',
      officiantId: act.officiantId,
      officiantSearch: act.officiantName,
      notes: act.notes ?? '',
      witnessesText: (act.witnesses ?? []).join('\n'),
      details: {
        marriageRegime: act.details?.marriageRegime ?? '',
        dateOfDeath: this.toDateInputValue(act.details?.dateOfDeath),
        burialLocation: act.details?.burialLocation ?? '',
        bibleVerse: act.details?.bibleVerse ?? '',
        godparentsText: (act.details?.godparents ?? []).join('\n'),
      },
    }, { emitEvent: false });

    this.selectedOfficiant.set({
      id: act.officiantId,
      firstName: '',
      lastName: '',
      fullName: act.officiantName,
    } as User);

    this.loadSites(act.churchId);

    this.participantsArray.clear();
    for (let i = 0; i < act.participants.length; i++) {
      const p = act.participants[i];
      const group = this.buildParticipantGroup();
      group.patchValue({
        memberId: p.memberId ?? '',
        firstName: p.firstName,
        lastName: p.lastName,
        role: p.role,
        dateOfBirth: this.toDateInputValue(p.dateOfBirth as any),
        memberSearch: p.memberId ? `${p.firstName} ${p.lastName}` : '',
      }, { emitEvent: false });
      this.participantsArray.push(group);

      if (p.memberId) {
        this.selectedParticipantMap.set(i, {
          id: p.memberId,
          firstName: p.firstName,
          lastName: p.lastName,
        } as any as Member);
      }

      this.watchParticipantSearch(group, i);
    }
  }

  private toDateInputValue(date: string | Date | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  // ───────────────────────────────────────────────────────────────
  // MODE ÉDITION
  // ───────────────────────────────────────────────────────────────

  enterEditMode(): void {
    this.isEditMode.set(true);
    this.saveError.set(null);
    this.router.navigate(['/dashboard/actes-pastoraux', this.actId, 'edit']);
  }

  cancelEditMode(): void {
    const a = this.act();
    if (a) this.populateForm(a);
    this.isEditMode.set(false);
    this.saveError.set(null);
    this.router.navigate(['/dashboard/actes-pastoraux', this.actId]);
  }

  // ───────────────────────────────────────────────────────────────
  // ÉGLISE / SITE
  // ───────────────────────────────────────────────────────────────

  private loadChurches(): void {
    this.loadingChurches.set(true);
    this.churchService
      .getAllChurches()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) this.churches.set(response.data as any);
          this.loadingChurches.set(false);
        },
        error: () => this.loadingChurches.set(false),
      });
  }

  private loadSites(churchId: string): void {
    this.sites.set([]);
    if (!churchId) return;

    this.loadingSites.set(true);
    this.churchService
      .getSitesByChurchId(churchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) this.sites.set(response.data as any);
          this.loadingSites.set(false);
        },
        error: () => this.loadingSites.set(false),
      });
  }

  // ───────────────────────────────────────────────────────────────
  // OFFICIANT
  // ───────────────────────────────────────────────────────────────

  private loadOfficiantRoleNames(): void {
    const codes = ['PASTOR_PRINCIPAL', 'PASTEUR_SITE'];
    const names: string[] = [];
    let remaining = codes.length;

    for (const code of codes) {
      this.roleService
        .getRoleByCode(code)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.data) names.push(response.data.roleName);
            remaining--;
            if (remaining === 0) this.officiantRoleNames.set(names);
          },
          error: () => {
            remaining--;
            if (remaining === 0) this.officiantRoleNames.set(names);
          },
        });
    }
  }

  private performOfficiantSearch(term: string): void {
    this.searchingOfficiant.set(true);
    this.showOfficiantResults.set(true);

    this.userService
      .getUsers({ fullName: term, page: 1, pageSize: 20 } as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const allowedNames = this.officiantRoleNames();
            const items = (response.data.items ?? []) as User[];
            const filtered = allowedNames.length > 0
              ? items.filter((u) => (u.roles ?? []).some((r) => allowedNames.includes(r)))
              : items;
            this.officiantResults.set(filtered);
          } else {
            this.officiantResults.set([]);
          }
          this.searchingOfficiant.set(false);
        },
        error: () => {
          this.officiantResults.set([]);
          this.searchingOfficiant.set(false);
        },
      });
  }

  selectOfficiant(user: User): void {
    this.selectedOfficiant.set(user);
    this.form.patchValue({
      officiantId: (user as any).memberId ?? user.id,
      officiantSearch: user.fullName || `${user.firstName} ${user.lastName}`,
    });
    this.showOfficiantResults.set(false);
    this.officiantResults.set([]);
  }

  clearOfficiant(): void {
    this.selectedOfficiant.set(null);
    this.form.patchValue({ officiantId: '', officiantSearch: '' });
  }

  getInitialsFromUser(user: User): string {
    const f = user.firstName?.charAt(0) || '?';
    const l = user.lastName?.charAt(0) || '?';
    return `${f}${l}`.toUpperCase() || '?';
  }

  // ───────────────────────────────────────────────────────────────
  // PARTICIPANTS
  // ───────────────────────────────────────────────────────────────

  get participantsArray(): FormArray {
    return this.form.get('participants') as FormArray;
  }

  private buildParticipantGroup(): FormGroup {
    return this.fb.group({
      memberId: [''],
      memberSearch: [''],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      role: [this.availableRoles()[0], Validators.required],
      dateOfBirth: [''],
    });
  }

  private watchParticipantSearch(group: FormGroup, index: number): void {
    group.get('memberSearch')?.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term: string) => {
        if (term && term.trim().length >= 2) {
          this.performParticipantSearch(index, term.trim());
        } else {
          this.participantResults.set([]);
          this.showParticipantResults.set(null);
        }
      });
  }

  addParticipant(): void {
    const group = this.buildParticipantGroup();
    const index = this.participantsArray.length;
    this.participantsArray.push(group);
    this.watchParticipantSearch(group, index);
  }

  removeParticipant(index: number): void {
    this.participantsArray.removeAt(index);
    this.selectedParticipantMap.delete(index);
  }

  private performParticipantSearch(index: number, term: string): void {
    this.searchingParticipant.set(index);
    this.showParticipantResults.set(index);

    this.memberService
      .getMembers({ page: 1, pageSize: 8, fullName: term } as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.participantResults.set((res as any)?.items ?? (res as any) ?? []);
          this.searchingParticipant.set(null);
        },
        error: () => {
          this.participantResults.set([]);
          this.searchingParticipant.set(null);
        },
      });
  }

  selectParticipant(index: number, member: Member): void {
    const group = this.participantsArray.at(index) as FormGroup;
    group.patchValue({
      memberId: (member as any).id,
      firstName: (member as any).firstName,
      lastName: (member as any).lastName,
      memberSearch: this.getMemberFullName(member),
    });
    this.selectedParticipantMap.set(index, member);
    this.showParticipantResults.set(null);
    this.participantResults.set([]);
  }

  clearParticipantMember(index: number): void {
    const group = this.participantsArray.at(index) as FormGroup;
    group.patchValue({ memberId: '', firstName: '', lastName: '', memberSearch: '' });
    this.selectedParticipantMap.delete(index);
  }

  getMemberFullName(member: Member): string {
    return (member as any).fullName ?? `${(member as any).firstName} ${(member as any).lastName}`;
  }

  getMemberInitials(member: Member): string {
    const f = (member as any).firstName?.charAt(0) ?? '?';
    const l = (member as any).lastName?.charAt(0) ?? '?';
    return `${f}${l}`.toUpperCase();
  }

  // ───────────────────────────────────────────────────────────────
  // VALIDATION / SOUMISSION
  // ───────────────────────────────────────────────────────────────

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  isParticipantFieldInvalid(index: number, field: string): boolean {
    const control = this.participantsArray.at(index).get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  private parseLines(text: string): string[] {
    return text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  }

  save(): void {
    if (this.form.invalid || this.participantsArray.length === 0) {
      this.form.markAllAsTouched();
      this.saveError.set('Veuillez corriger les champs invalides et conserver au moins un participant.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    const value = this.form.value;
    const type = value.type as PastoralActType;

    const payload: PastoralActUpdateDto = {
      date: value.date,
      location: value.location || null,
      officiantId: value.officiantId,
      participants: (value.participants ?? []).map((p: any) => ({
        memberId: p.memberId || null,
        firstName: p.firstName,
        lastName: p.lastName,
        role: p.role,
        dateOfBirth: p.dateOfBirth || null,
      })),
      witnesses: this.parseLines(value.witnessesText || ''),
      details: this.buildDetailsPayload(type, value.details),
      siteId: value.siteId || null,
      notes: value.notes || null,
    };

    this.pastoralActService
      .update(this.actId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          if (response.isSuccess) {
            this.act.set(response);
            this.isEditMode.set(false);
            this.saveSuccess.set(true);
            this.router.navigate(['/dashboard/actes-pastoraux', this.actId]);
            setTimeout(() => this.saveSuccess.set(false), 3000);
          } else {
            this.saveError.set(response.errorMessage || 'Une erreur est survenue lors de la mise à jour.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur lors de la mise à jour:', err);
          this.saving.set(false);
          this.saveError.set('Une erreur est survenue lors de la mise à jour.');
        },
      });
  }

  private buildDetailsPayload(type: PastoralActType, details: any): any {
    switch (type) {
      case PastoralActType.Wedding:
        return { marriageRegime: details.marriageRegime || undefined };
      case PastoralActType.Funeral:
        return {
          dateOfDeath: details.dateOfDeath || undefined,
          burialLocation: details.burialLocation || undefined,
        };
      case PastoralActType.Baptism:
      case PastoralActType.ChildDedication:
        return {
          bibleVerse: details.bibleVerse || undefined,
          godparents: this.parseLines(details.godparentsText || ''),
        };
      default:
        return null;
    }
  }

  // ───────────────────────────────────────────────────────────────
  // CERTIFICAT
  // ───────────────────────────────────────────────────────────────

  canGenerateCertificate(): boolean {
    const a = this.act();
    return !!a && !a.certificateGenerated && a.type !== PastoralActType.Funeral;
  }

  generateCertificate(): void {
    if (!this.canGenerateCertificate()) return;
    this.generatingCertificate.set(true);

    this.pastoralActService
      .generateCertificate(this.actId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.generatingCertificate.set(false);
          if (response.isSuccess) {
            this.act.set(response);
          } else {
            this.error.set(response.errorMessage || 'Impossible de générer le certificat.');
          }
        },
        error: () => {
          this.generatingCertificate.set(false);
          this.error.set('Impossible de générer le certificat.');
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
    this.pastoralActService
      .delete(this.actId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.router.navigate(['/dashboard/actes-pastoraux']);
        },
        error: (err) => {
          console.error('❌ Erreur lors de la suppression:', err);
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.error.set('Impossible de supprimer cet acte pastoral.');
        },
      });
  }

  viewAct(act: PastoralActResponseDto): void {
  this.router.navigate(['/dashboard/actes-pastoraux', act.id, 'edit']);
}

editAct(act: PastoralActResponseDto, event: Event): void {
  event.stopPropagation();
  this.router.navigate(['/dashboard/actes-pastoraux', act.id, 'edit']);
}

  // ───────────────────────────────────────────────────────────────
  // HELPERS D'AFFICHAGE
  // ───────────────────────────────────────────────────────────────

  getTypeLabel(type: PastoralActType): string { return PastoralActUtils.getTypeLabel(type); }
  getTypeIcon(type: PastoralActType): string { return PastoralActUtils.getTypeIcon(type); }
  getTypeColor(type: PastoralActType): string { return PastoralActUtils.getTypeColor(type); }
  formatDate(date: Date | string | null | undefined): string { return PastoralActUtils.formatDate(date); }
}
