// src/app/features/dashboard/dashboard/pastoral-acts/pastoral-act-edit/pastoral-act-edit.ts
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, signal, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { Church as ChurchModel } from '../../../../../core/models/Church/church.model';
import { Church as ChurchService } from '../../../../../core/services/Church/church';
import { Site } from '../../../../../core/models/Church/site.model';
import { Member } from '../../../../../core/models/Members/member.model';
import {
  PastoralActUpdateDto,
  PastoralActResponseDto,
} from '../../../../../core/models/PastoralAct/pastoral-act.dtos';
import { PastoralActType, PastoralActTypeLabels, PastoralActTypeIcons } from '../../../../../core/models/PastoralAct/pastoral-act.enums';
import { PASTORAL_ACT_ROLES } from '../../../../../core/models/PastoralAct/pastoral-act.models';
import { User } from '../../../../../core/models/Users/user.model';
import { Members } from '../../../../../core/services/Members/members';
import { Roles } from '../../../../../core/services/Roles/roles';
import { Users } from '../../../../../core/services/Users/users';
import { PastoralActs } from '../../../../../core/services/PastoralAct/pastoral-acts';

@Component({
  selector: 'app-pastoral-act-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './pastoral-act-edit.html',
  styleUrl: './pastoral-act-edit.scss',
})
export class PastoralActEdit implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private actId = '';

  readonly PastoralActType = PastoralActType;

  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  saveSuccess = signal(false);

  act = signal<PastoralActResponseDto | null>(null);

  // ── Type figé à la création : jamais modifiable en édition ──
  fixedType = signal<PastoralActType | null>(null);
  typeIcon = computed(() => (this.fixedType() ? PastoralActTypeIcons[this.fixedType()!] : ''));
  typeLabel = computed(() => (this.fixedType() ? PastoralActTypeLabels[this.fixedType()!] : ''));

  // ── Église / Site (site modifiable, église non car structurante) ──
  sites = signal<Site[]>([]);
  loadingSites = signal(false);

  // ── Officiant ──
  officiantRoleNames = signal<string[]>([]);
  searchingOfficiant = signal(false);
  showOfficiantResults = signal(false);
  officiantResults = signal<User[]>([]);
  selectedOfficiant = signal<User | null>(null);
  loadingOfficiant = signal(true);

  // ── Participants ──
  searchingParticipant = signal<number | null>(null);
  showParticipantResults = signal<number | null>(null);
  participantResults = signal<Member[]>([]);
  selectedParticipantMap = new Map<number, Member>();

  form: FormGroup;

  // ✅ Rôles disponibles dérivés du type FIGÉ de l'acte, pas d'un select modifiable
  availableRoles = computed((): string[] => {
    const type = this.fixedType();
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
    return [...roles];
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
      date: ['', Validators.required],
      location: [''],
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
    if (!this.actId) {
      this.error.set("Identifiant d'acte invalide.");
      this.loading.set(false);
      return;
    }

    this.loadOfficiantRoleNames();
    this.loadAct();

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
  // CHARGEMENT DE L'ACTE
  // ───────────────────────────────────────────────────────────────

  private loadAct(): void {
    this.loading.set(true);
    this.error.set(null);

    this.pastoralActService
      .getById(this.actId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (act) => {
          if (act) {
            this.act.set(act);
            this.fixedType.set(act.type);
            this.populateForm(act);
            this.loadSites(act.churchId);
            // ✅ CORRECTION — récupération fiable de l'officiant via son vrai ID utilisateur
            this.loadOfficiant(act.officiantId);
          } else {
            this.error.set('Acte pastoral non trouvé.');
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error("❌ Erreur lors du chargement de l'acte pastoral:", err);
          this.error.set('Impossible de charger cet acte pastoral.');
          this.loading.set(false);
        },
      });
  }

  private populateForm(act: PastoralActResponseDto): void {
    this.form.patchValue({
      date: this.toDateInputValue(act.date as any),
      location: act.location || '',
      siteId: act.siteId || '',
      officiantId: act.officiantId,
      officiantSearch: act.officiantName || '',
      notes: act.notes || '',
      witnessesText: (act.witnesses || []).join('\n'),
      details: {
        marriageRegime: act.details?.marriageRegime || '',
        dateOfDeath: act.details?.dateOfDeath ? this.toDateInputValue(act.details.dateOfDeath as any) : '',
        burialLocation: act.details?.burialLocation || '',
        bibleVerse: act.details?.bibleVerse || '',
        godparentsText: (act.details?.godparents || []).join('\n'),
      },
    }, { emitEvent: false });

    // Reconstruit le FormArray des participants
    this.participantsArray.clear();
    for (const p of act.participants || []) {
      const group = this.buildParticipantGroup();
      group.patchValue({
        memberId: p.memberId || '',
        firstName: p.firstName,
        lastName: p.lastName,
        role: p.role,
        dateOfBirth: p.dateOfBirth ? this.toDateInputValue(p.dateOfBirth as any) : '',
        memberSearch: p.memberId ? `${p.firstName} ${p.lastName}` : '',
      }, { emitEvent: false });
      this.participantsArray.push(group);

      const index = this.participantsArray.length - 1;
      if (p.memberId) {
        // Pré-affiche la sélection sans forcer un rechargement complet du membre
        this.selectedParticipantMap.set(index, {
          id: p.memberId,
          firstName: p.firstName,
          lastName: p.lastName,
        } as Member);
      }

      this.watchParticipantSearch(index);
    }

    if (this.participantsArray.length === 0) {
      this.addParticipant();
    }
  }

  /**
   * ✅ CORRECTION du bug de récupération de l'officiant.
   * OfficiantId référence toujours un User (jamais un Member) côté backend.
   * On le résout donc systématiquement via getUserById — plus de confusion
   * entre memberId et userId comme c'était le cas dans l'ancien selectOfficiant().
   */
  private loadOfficiant(officiantId: string): void {
    if (!officiantId) {
      this.loadingOfficiant.set(false);
      return;
    }

    this.loadingOfficiant.set(true);
    this.userService
      .getUserById(officiantId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.selectedOfficiant.set(response.data);
            const fullName = response.data.fullName
              || `${response.data.firstName} ${response.data.lastName}`;
            this.form.get('officiantSearch')?.setValue(fullName, { emitEvent: false });
          }
          this.loadingOfficiant.set(false);
        },
        error: (err) => {
          console.error("❌ Erreur lors de la récupération de l'officiant:", err);
          // Le nom déjà présent dans act.officiantName reste affiché en repli,
          // l'utilisateur peut re-sélectionner un officiant manuellement.
          this.loadingOfficiant.set(false);
        },
      });
  }

  private loadSites(churchId: string): void {
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
  // RECHERCHE DE L'OFFICIANT
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
      officiantId: user.id, // ✅ toujours l'ID utilisateur réel
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
      role: [this.availableRoles()[0] || '', Validators.required],
      dateOfBirth: [''],
    });
  }

  private watchParticipantSearch(index: number): void {
    const group = this.participantsArray.at(index) as FormGroup;
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
    this.watchParticipantSearch(index);
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
    group.patchValue({ memberId: '', memberSearch: '' });
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
      this.error.set('Veuillez corriger les champs invalides et conserver au moins un participant.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.saveSuccess.set(false);

    const value = this.form.value;
    const type = this.fixedType()!;

    const payload: PastoralActUpdateDto = {
      date: value.date,
      location: value.location || undefined,
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
      siteId: value.siteId || undefined,
      notes: value.notes || undefined,
    };

    this.pastoralActService
      .update(this.actId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PastoralActResponseDto) => {
          this.saving.set(false);
          if (response.isSuccess !== false) {
            this.act.set(response);
            this.saveSuccess.set(true);
            setTimeout(() => this.saveSuccess.set(false), 3000);
          } else {
            this.error.set(response.errorMessage || 'Erreur lors de la mise à jour.');
          }
        },
        error: (err) => {
          console.error("❌ Erreur lors de la mise à jour de l'acte pastoral:", err);
          this.saving.set(false);
          this.error.set('Une erreur est survenue lors de la mise à jour.');
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
    this.router.navigate(['/dashboard/actes-pastoraux']);
  }
  // ⚠️ Pas de méthode delete() ici volontairement — la suppression reste
  // exclusivement une action du tableau de liste (pastoral-act-list).

  private toDateInputValue(date: string | Date): string {
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }
}
