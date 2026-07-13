// src/app/features/dashboard/dashboard/members/pastoral-acts/pastoral-act-create/pastoral-act-create.ts
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, signal, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ChurchListResponse, Church as ChurchModel } from '../../../../../core/models/Church/church.model';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { Site } from '../../../../../core/models/Church/site.model';
import { Member } from '../../../../../core/models/Members/member.model';
import { PastoralActCreateDto, PastoralActResponseDto } from '../../../../../core/models/PastoralAct/pastoral-act.dtos';
import { PastoralActType, PastoralActTypeLabels, PastoralActTypeIcons } from '../../../../../core/models/PastoralAct/pastoral-act.enums';
import { PASTORAL_ACT_ROLES } from '../../../../../core/models/PastoralAct/pastoral-act.models';
import { User } from '../../../../../core/models/Users/user.model';
import { Members } from '../../../../../core/services/Members/members';
import { Roles } from '../../../../../core/services/Roles/roles';
import { Users } from '../../../../../core/services/Users/users';
import { Church as ChurchService } from '../../../../../core/services/Church/church';
import { PastoralActs } from '../../../../../core/services/PastoralAct/pastoral-acts';


const TYPE_OPTIONS = Object.values(PastoralActType).map((value) => ({
  value,
  label: PastoralActTypeLabels[value],
  icon: PastoralActTypeIcons[value],
}));

@Component({
  selector: 'app-pastoral-act-create',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './pastoral-act-create.html',
  styleUrl: './pastoral-act-create.scss',
})
export class PastoralActCreate implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  readonly typeOptions = TYPE_OPTIONS;
  readonly PastoralActType = PastoralActType;

  saving = signal(false);
  error = signal<string | null>(null);

  // ── Église / Site ──
  churches = signal<ChurchModel[]>([]);
  loadingChurches = signal(false);
  sites = signal<Site[]>([]);
  loadingSites = signal(false);

  // ── Officiant (recherche de pasteur) ──
  officiantRoleNames = signal<string[]>([]);
  searchingOfficiant = signal(false);
  showOfficiantResults = signal(false);
  officiantResults = signal<User[]>([]);
  selectedOfficiant = signal<User | null>(null);

  // ── Recherche de participant (par index dans le FormArray) ──
  searchingParticipant = signal<number | null>(null);
  showParticipantResults = signal<number | null>(null);
  participantResults = signal<Member[]>([]);
  selectedParticipantMap = new Map<number, Member>();

  form: FormGroup;

  selectedType = computed(() => this.form?.get('type')?.value as PastoralActType);

  availableRoles = computed((): string[] => {
  const type = this.selectedType();
  let roles: readonly string[];
  switch (type) {
    case PastoralActType.Baptism:
      roles = PASTORAL_ACT_ROLES.Baptism;
      break;
    case PastoralActType.Wedding:
      roles = PASTORAL_ACT_ROLES.Wedding;
      break;
    case PastoralActType.Funeral:
      roles = PASTORAL_ACT_ROLES.Funeral;
      break;
    case PastoralActType.ChildDedication:
      roles = PASTORAL_ACT_ROLES.ChildDedication;
      break;
    default:
      roles = PASTORAL_ACT_ROLES.Other;
      break;
  }
  return [...roles]; // ✔ conversion en tableau simple
});

  constructor(
    private fb: FormBuilder,
    private pastoralActService: PastoralActs,
    private memberService: Members,
    private userService: Users,
    private roleService: Roles,
    private churchService: ChurchService,
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
      witnessesText: [''], // saisie libre, une ligne par témoin

      participants: this.fb.array([]),

      // ── Détails conditionnels ──
      details: this.fb.group({
        marriageRegime: [''],
        dateOfDeath: [''],
        burialLocation: [''],
        bibleVerse: [''],
        godparentsText: [''], // saisie libre, une ligne par parrain/marraine
      }),
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.loadChurches();
    this.loadOfficiantRoleNames();
    this.addParticipant(); // au moins un participant par défaut

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

    // Réinitialise le rôle par défaut des participants existants au changement de type
    this.form.get('type')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        for (const control of this.participantsArray.controls) {
          control.get('role')?.setValue(this.availableRoles()[0]);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    this.form.get('siteId')?.setValue('');
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
  // RECHERCHE DE L'OFFICIANT (pasteur)
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
    return `${f}${l}`.toUpperCase();
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

  addParticipant(): void {
    const group = this.buildParticipantGroup();
    const index = this.participantsArray.length;
    this.participantsArray.push(group);

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
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  submit(): void {
    if (this.form.invalid || this.participantsArray.length === 0) {
      this.form.markAllAsTouched();
      this.error.set('Veuillez corriger les champs invalides et ajouter au moins un participant.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const value = this.form.value;
    const type = value.type as PastoralActType;

    const payload: PastoralActCreateDto = {
      type,
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
      churchId: value.churchId,
      siteId: value.siteId || null,
      notes: value.notes || null,
    };

    this.pastoralActService
      .create(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PastoralActResponseDto) => {  // ✅ Utiliser le type réel
          this.saving.set(false);
          if (response.isSuccess && response.id) {
            this.router.navigate(['/dashboard/actes-pastoraux', response.id]);
          } else {
            this.error.set(response.errorMessage || 'Une erreur est survenue lors de la création.');
          }
        },
        error: (err: any) => {
          console.error('❌ Erreur lors de la création de l’acte pastoral:', err);
          this.saving.set(false);
          this.error.set('Une erreur est survenue lors de la création.');
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

  cancel(): void {
    this.router.navigate(['/dashboard/membres/actes-pastoraux']);
  }

  getTypeIcon(type: PastoralActType): string {
    return PastoralActTypeIcons[type] ?? '📋';
  }
}
