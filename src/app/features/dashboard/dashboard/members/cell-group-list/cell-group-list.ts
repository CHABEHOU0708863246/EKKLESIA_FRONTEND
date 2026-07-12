// src/app/features/dashboard/dashboard/members/cell-group-list/cell-group-list.ts
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, signal, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import {
  CellGroup,
  CellGroupCreate,
  CellGroupFilter,
  DEFAULT_CELL_GROUP_FILTER,
  WEEK_DAYS,
  CellGroupUtils,
} from '../../../../../core/models/Members/cell-group.model';
import { Member, MemberListResponse } from '../../../../../core/models/Members/member.model';
import { Members } from '../../../../../core/services/Members/members';
import { ConfirmDialog } from '../../../../../core/components/confirm-dialog/confirm-dialog';
import { Church as ChurchModel } from '../../../../../core/models/Church/church.model';
import { Church as ChurchService } from '../../../../../core/services/Church/church';
import { Users } from '../../../../../core/services/Users/users';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

// Libellés lisibles pour les codes de rôle système
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  PASTOR_PRINCIPAL: 'Pasteur Principal',
  PASTEUR_SITE: 'Pasteur de Site',
  ELDER: 'Ancien / Diacre',
  TREASURER: 'Trésorier',
  PASTORAL_SECRETARY: 'Secrétaire Pastoral',
  CELL_LEADER: 'Chef de Cellule',
  DEPARTMENT_HEAD: 'Resp. Département',
  HR_MANAGER: 'Resp. RH',
  COMMUNICATION: 'Resp. Communication',
  PROPERTY_MANAGER: 'Resp. Patrimoine',
  MEMBER: 'Membre',
  VOLUNTEER: 'Bénévole',
};

@Component({
  selector: 'app-cell-group-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, ConfirmDialog],
  templateUrl: './cell-group-list.html',
  styleUrl: './cell-group-list.scss',
})
export class CellGroupList implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private leaderSearch$ = new Subject<string>();
  private leaderNameCache = new Map<string, string | null>()

  readonly weekDays = WEEK_DAYS;
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  // ── Contexte église (sélecteur réel) ──
  churches = signal<ChurchModel[]>([]);
  loadingChurches = signal(false);
  selectedChurchId = signal<string>('');

  selectedChurch = computed(() =>
    this.churches().find((c) => c.id === this.selectedChurchId()) ?? null
  );

  // Le bouton "Nouvelle cellule" n'est activable QUE si une église est sélectionnée
  canCreate = computed(() => !!this.selectedChurchId());

  // ── Filtres de liste ──
  searchControl = new FormControl('');
  dayControl = new FormControl('');
  statusControl = new FormControl('');

  cellGroups = signal<CellGroup[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  currentPage = signal(1);
  pageSize = signal(20);
  totalCount = signal(0);
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  isEmpty = computed(() => !this.loading() && this.cellGroups().length === 0);

  private filter: CellGroupFilter = { ...DEFAULT_CELL_GROUP_FILTER };

  // ── Panneau de création (right panel) ──
  showCreatePanel = signal(false);
  creating = signal(false);
  createError = signal<string | null>(null);
  createForm: FormGroup;

  // ── Recherche du responsable ──
  leaderResults: Member[] = [];
  searchingLeader = signal(false);
  showLeaderResults = signal(false);
  selectedLeader: Member | null = null;

  // ── Suppression ──
  deleteDialogVisible = signal(false);
  cellGroupToDelete = signal<CellGroup | null>(null);
  deleting = signal(false);

  // ── Cache des rôles système par ID de membre (pour le badge dans le tableau) ──
  private leaderRoleCache = new Map<string, string[] | null>();
  leaderRolesVersion = signal(0); // force le rafraîchissement du template après un lookup async

  constructor(
    private fb: FormBuilder,
    private memberService: Members,
    private churchService: ChurchService,
    private userService: Users,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.createForm = this.fb.group({
      churchId: ['', Validators.required],
      name: ['', [Validators.required, Validators.minLength(3)]],
      leaderId: ['', Validators.required],
      location: [''],
      meetingDay: [''],
      meetingTime: [''],
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.loadChurches();

    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => { this.currentPage.set(1); this.loadCellGroups(); });

    this.dayControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => { this.currentPage.set(1); this.loadCellGroups(); });

    this.statusControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => { this.currentPage.set(1); this.loadCellGroups(); });

    this.leaderSearch$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => this.performLeaderSearch(term));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  private loadLeaderName(memberId: string): void {
  if (!memberId || this.leaderNameCache.has(memberId)) return;

  this.leaderNameCache.set(memberId, null); // marque "en cours"

  this.memberService
    .getMemberById(memberId)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (member) => {
        const fullName = member?.fullName || `${member?.firstName || ''} ${member?.lastName || ''}`.trim();
        const name = fullName || null;
        this.leaderNameCache.set(memberId, name);

        // Met à jour la cellule correspondante dans le signal
        this.cellGroups.update((groups) =>
          groups.map((cg) => {
            if (cg.leaderId === memberId) {
              return { ...cg, leaderName: name || cg.leaderName };
            }
            return cg;
          })
        );
        this.leaderRolesVersion.update((v) => v + 1);
      },
      error: () => {
        this.leaderNameCache.set(memberId, null);
        this.leaderRolesVersion.update((v) => v + 1);
      },
    });
}

  // ───────────────────────────────────────────────────────────────
  // ÉGLISES (Selectbox / Lookup)
  // ───────────────────────────────────────────────────────────────

loadChurches(): void {
  this.loadingChurches.set(true);
  this.churchService
    .getChurches({ page: 1, pageSize: 100 }) // Récupère un grand nombre d’églises
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // ✅ response.data.items est bien le tableau d’églises
          this.churches.set(response.data.items);
        } else {
          this.error.set(response.message || 'Aucune église trouvée.');
        }
        this.loadingChurches.set(false);
        this.loadCellGroups();
      },
      error: (err) => {
        console.error('❌ Erreur getChurches:', err);
        this.loadingChurches.set(false);
        this.error.set('Impossible de charger la liste des églises.');
        this.loadCellGroups();
      },
    });
}

  onChurchSelected(churchId: string): void {
    this.selectedChurchId.set(churchId);
    this.currentPage.set(1);
    this.leaderRoleCache.clear();
    this.loadCellGroups();
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT DE LA LISTE
  // ───────────────────────────────────────────────────────────────

  loadCellGroups(): void {
  this.loading.set(true);
  this.error.set(null);

  const churchId = this.selectedChurchId() || undefined;

  this.filter = {
    ...DEFAULT_CELL_GROUP_FILTER,
    page: this.currentPage(),
    pageSize: this.pageSize(),
    name: this.searchControl.value || undefined,
    meetingDay: this.dayControl.value || undefined,
    isActive: this.statusControl.value === '' ? undefined : this.statusControl.value === 'true',
  };

  this.memberService
    .getCellGroups(churchId, this.filter.isActive)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (groups) => {
        let filtered = groups ?? [];

        if (this.filter.name) filtered = CellGroupUtils.searchCellGroups(filtered, this.filter.name);
        if (this.filter.meetingDay) {
          filtered = filtered.filter(
            (g) => (g.meetingDay || '').toLowerCase() === this.filter.meetingDay!.toLowerCase()
          );
        }

        this.totalCount.set(filtered.length);
        const start = (this.currentPage() - 1) * this.pageSize();
        const page = filtered.slice(start, start + this.pageSize());

        // ✅ Enrichir avec le nom de l'église
        const enriched = page.map((cg) => {
          const church = this.churches().find((c) => c.id === cg.churchId);
          return {
            ...cg,
            churchName: church?.name || cg.churchName || '—',
          };
        });

        this.cellGroups.set(enriched);
        this.loading.set(false);

        // ✅ Charger les noms des responsables et les rôles
        for (const cg of enriched) {
          if (cg.leaderId) {
            this.loadLeaderName(cg.leaderId);
            this.loadLeaderRole(cg.leaderId);
          }
        }
      },
      error: () => {
        this.cellGroups.set([]);
        this.loading.set(false);
        this.error.set('Impossible de charger la liste des cellules.');
      },
    });
}

  refresh(): void {
    this.loadCellGroups();
  }

  resetFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.dayControl.setValue('', { emitEvent: false });
    this.statusControl.setValue('', { emitEvent: false });
    this.currentPage.set(1);
    this.loadCellGroups();
  }

  // ───────────────────────────────────────────────────────────────
  // RÔLE SYSTÈME DU RESPONSABLE (badge discret)
  // ───────────────────────────────────────────────────────────────

  private loadLeaderRole(memberId: string | undefined): void {
    if (!memberId || this.leaderRoleCache.has(memberId)) return;

    this.leaderRoleCache.set(memberId, null); // marque "en cours" pour éviter les doublons

    this.userService
      .getUserByMemberId(memberId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const roles = response.success && response.data ? response.data.roles ?? [] : [];
          this.leaderRoleCache.set(memberId, roles);
          this.leaderRolesVersion.update((v) => v + 1);
        },
        error: () => {
          this.leaderRoleCache.set(memberId, []);
          this.leaderRolesVersion.update((v) => v + 1);
        },
      });
  }

  getLeaderRoleLabel(memberId: string | undefined): string | null {
    if (!memberId) return null;
    const roles = this.leaderRoleCache.get(memberId);
    if (!roles || roles.length === 0) return null;
    return ROLE_LABELS[roles[0]] ?? roles[0];
  }

  // ───────────────────────────────────────────────────────────────
  // PAGINATION
  // ───────────────────────────────────────────────────────────────

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadCellGroups();
  }

  previousPage(): void { this.goToPage(this.currentPage() - 1); }
  nextPage(): void { this.goToPage(this.currentPage() + 1); }

  onPageSizeChange(size: string): void {
    this.pageSize.set(Number(size));
    this.currentPage.set(1);
    this.loadCellGroups();
  }

  get pageRangeLabel(): string {
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize(), this.totalCount());
    return this.totalCount() === 0 ? '0 résultat' : `${start}–${end} sur ${this.totalCount()}`;
  }

  // ───────────────────────────────────────────────────────────────
  // PANNEAU DE CRÉATION (Right Panel)
  // ───────────────────────────────────────────────────────────────

  openCreatePanel(): void {
    if (!this.canCreate()) return; // sécurité, le bouton est déjà disabled
    this.showCreatePanel.set(true);
    this.createError.set(null);
    this.createForm.patchValue({ churchId: this.selectedChurchId() });
  }

  closeCreatePanel(): void {
    this.showCreatePanel.set(false);
    this.createForm.reset({
      churchId: this.selectedChurchId(),
      name: '', leaderId: '', location: '', meetingDay: '', meetingTime: '',
    });
    this.selectedLeader = null;
    this.leaderResults = [];
    this.createError.set(null);
  }

  onLeaderInput(term: string): void {
    if (this.selectedLeader && term !== this.getFullName(this.selectedLeader)) {
      this.selectedLeader = null;
      this.createForm.get('leaderId')?.setValue('');
    }
    if (term.trim().length < 2) {
      this.leaderResults = [];
      this.showLeaderResults.set(false);
      return;
    }
    this.leaderSearch$.next(term.trim());
  }

  private performLeaderSearch(term: string): void {
  this.searchingLeader.set(true);
  this.showLeaderResults.set(true);

  this.memberService
    .getMembers({ page: 1, pageSize: 6, fullName: term } as any)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res: MemberListResponse) => {
        // ✅ res.items est le tableau de membres
        this.leaderResults = res.items || [];
        this.searchingLeader.set(false);
        // Si aucun résultat, on laisse le message "Aucun membre trouvé" s'afficher
      },
      error: (err) => {
        console.error('❌ Erreur lors de la recherche de responsables:', err);
        this.leaderResults = [];
        this.searchingLeader.set(false);
        this.showLeaderResults.set(false); // masque la dropdown pour ne pas afficher d'erreur
      },
    });
}

  selectLeader(member: Member): void {
    this.selectedLeader = member;
    this.createForm.get('leaderId')?.setValue((member as any).id);
    this.showLeaderResults.set(false);
  }

  clearLeader(): void {
    this.selectedLeader = null;
    this.createForm.get('leaderId')?.setValue('');
    this.leaderResults = [];
  }

  isFieldInvalid(field: string): boolean {
    const control = this.createForm.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  createCellGroup(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.creating.set(true);
    this.createError.set(null);

    const value = this.createForm.value;
    const payload: CellGroupCreate = {
      name: value.name,
      leaderId: value.leaderId,
      location: value.location || undefined,
      meetingDay: value.meetingDay || undefined,
      meetingTime: value.meetingTime || undefined,
      churchId: value.churchId,
      isActive: true,
    };

    this.memberService
      .createCellGroup(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.creating.set(false);
          this.closeCreatePanel();
          this.currentPage.set(1);
          this.loadCellGroups();
        },
        error: (err) => {
          console.error('❌ Erreur lors de la création de la cellule:', err);
          this.creating.set(false);
          this.createError.set('Une erreur est survenue lors de la création. Veuillez réessayer.');
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // ÉDITION / SUPPRESSION
  // ───────────────────────────────────────────────────────────────

  openCellGroup(cellGroup: CellGroup): void {
    this.router.navigate(['/dashboard/membres/cellules', cellGroup.id]);
  }

  editCellGroup(cellGroup: CellGroup, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/dashboard/membres/cellules', cellGroup.id, 'edit']);
  }

  requestDelete(cellGroup: CellGroup, event: Event): void {
    event.stopPropagation();
    this.cellGroupToDelete.set(cellGroup);
    this.deleteDialogVisible.set(true);
  }

  cancelDelete(): void {
    this.deleteDialogVisible.set(false);
    this.cellGroupToDelete.set(null);
  }

  confirmDelete(): void {
    const cg = this.cellGroupToDelete();
    if (!cg) return;

    this.deleting.set(true);
    this.memberService
      .deleteCellGroup(cg.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.cellGroupToDelete.set(null);
          this.loadCellGroups();
        },
        error: (err) => {
          console.error('❌ Erreur lors de la suppression:', err);
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.cellGroupToDelete.set(null);
          this.error.set('Impossible de supprimer cette cellule.');
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // HELPERS D'AFFICHAGE
  // ───────────────────────────────────────────────────────────────

  getInitials(name: string): string { return CellGroupUtils.getInitials(name); }
  getFullName(member: Member): string {
    return (member as any).fullName ?? `${(member as any).firstName} ${(member as any).lastName}`;
  }
  getStatusBadge(isActive: boolean) { return CellGroupUtils.getStatusBadge(isActive); }
  getMeetingDayLabel(day?: string): string { return CellGroupUtils.getMeetingDayLabel(day); }
  getFormattedMeetingTime(time?: string): string { return CellGroupUtils.getFormattedMeetingTime(time); }
}
