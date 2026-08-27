import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, signal, computed } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { forkJoin, of } from 'rxjs';
import { switchMap, map, catchError, tap, finalize } from 'rxjs/operators';

interface ResponsibleOption {
  id: string;
  fullName: string;
  phone: string;
  email: string;
}

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
// ✅ NOUVEAU — modèle et service de site (à adapter selon tes chemins réels)
import { Site as SiteModel } from '../../../../../core/models/Church/site.model';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

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

  churches = signal<ChurchModel[]>([]);
  loadingChurches = signal(false);
  selectedChurchId = signal<string>('');

  selectedChurch = computed(() =>
    this.churches().find((c) => c.id === this.selectedChurchId()) ?? null
  );

  canCreate = computed(() => !!this.selectedChurchId());

  // ✅ NOUVEAU — sites de l'église sélectionnée dans le panneau de création
  sites = signal<SiteModel[]>([]);
  loadingSites = signal(false);

responsibles = signal<ResponsibleOption[]>([]);
  loadingResponsibles = signal(false);

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

  showCreatePanel = signal(false);
  creating = signal(false);
  createError = signal<string | null>(null);
  createForm: FormGroup;

  leaderResults: Member[] = [];
  searchingLeader = signal(false);
  showLeaderResults = signal(false);
  selectedLeader: Member | null = null;

  deleteDialogVisible = signal(false);
  cellGroupToDelete = signal<CellGroup | null>(null);
  deleting = signal(false);

  private leaderRoleCache = new Map<string, string[] | null>();
  leaderRolesVersion = signal(0);

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
      siteId: [''],
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.loadChurches();
    this.loadResponsibles();

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

private loadResponsibles(): void {
  this.loadingResponsibles.set(true);

  const responsibleRoles = [
    'Responsable de Cellule',
    'Pasteur de Site',
    'Pasteur Principal',
    'Ancien / Diacre',
    'Responsable de Département'
  ];

  this.userService
    .getUsers({ page: 1, pageSize: 100 })
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => this.loadingResponsibles.set(false)), // 🔥 toujours exécuté
      tap((response) => {
        if (response.data?.items) {
          console.log('🔍 Exemple de rôles :', response.data.items[0]?.roles);
        }
      }),
      map((userResponse) => {
        if (!userResponse.success || !userResponse.data) return [];

        return userResponse.data.items
          .filter((user) =>
            (user.roles ?? []).some((r) =>
              responsibleRoles.some((allowed) => allowed === r)
            )
          )
          .map((user) => ({
            id: user.id,
            fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            phone: user.phone || '',
            email: user.email || '',
          }));
      })
    )
    .subscribe({
      next: (results) => {
        console.log('✅ Responsables filtrés :', results);
        this.responsibles.set(results);
      },
      error: (err) => {
        console.error('❌ Erreur :', err);
        this.responsibles.set([]);
      },
    });
}

  private loadLeaderName(memberId: string): void {
    if (!memberId || this.leaderNameCache.has(memberId)) return;

    this.leaderNameCache.set(memberId, null);

    this.memberService
      .getMemberById(memberId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (member) => {
          const fullName = member?.fullName || `${member?.firstName || ''} ${member?.lastName || ''}`.trim();
          const name = fullName || null;
          this.leaderNameCache.set(memberId, name);

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
      .getChurches({ page: 1, pageSize: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
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
  // SITES (dépendants de l'église sélectionnée dans le panneau de création)
  // ───────────────────────────────────────────────────────────────

  // ✅ NOUVEAU
  // ───────────────────────────────────────────────────────────────
  // SITES (dépendants de l'église sélectionnée dans le panneau de création)
  // ───────────────────────────────────────────────────────────────

  private loadSitesForChurch(churchId: string): void {
    if (!churchId) {
      this.sites.set([]);
      return;
    }

    this.loadingSites.set(true);
    this.churchService
      .getSitesByChurchId(churchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // ✅ handleError() de Church renvoie un next avec success:false en cas
          // d'erreur HTTP (pas de branche error() séparée à gérer ici).
          this.sites.set(response.success && response.data ? response.data : []);
          this.loadingSites.set(false);
        },
        // Filet de sécurité, même si le service intercepte déjà les erreurs.
        error: () => {
          this.sites.set([]);
          this.loadingSites.set(false);
        },
      });
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

          const enriched = page.map((cg) => {
            const church = this.churches().find((c) => c.id === cg.churchId);
            return {
              ...cg,
              churchName: church?.name || cg.churchName || '—',
            };
          });

          this.cellGroups.set(enriched);
          this.loading.set(false);

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

    this.leaderRoleCache.set(memberId, null);

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
    if (!this.canCreate()) return;
    this.showCreatePanel.set(true);
    this.createError.set(null);
    this.createForm.patchValue({ churchId: this.selectedChurchId(), siteId: '' });
    this.loadSitesForChurch(this.selectedChurchId());
    this.loadResponsibles(); // rafraîchit si besoin
  }

  closeCreatePanel(): void {
    this.showCreatePanel.set(false);
    this.createForm.reset({
      churchId: this.selectedChurchId(),
      name: '', leaderId: '', location: '', meetingDay: '', meetingTime: '', siteId: '',
    });
    this.selectedLeader = null;
    this.leaderResults = [];
    this.sites.set([]); // ✅ NOUVEAU
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
    this.leaderResults = [];

    // Rôles considérés comme responsables
const responsibleRoles = [
  'CELL_LEADER', 'Responsable de Cellule',
  'PASTEUR_SITE', 'Pasteur de Site',
  'PASTOR_PRINCIPAL', 'Pasteur Principal',
  'ELDER', 'Ancien / Diacre',
  'DEPARTMENT_HEAD', 'Responsable de Département'
];

    this.memberService
      .getMembers({ page: 1, pageSize: 10, fullName: term } as any)
      .pipe(
        takeUntil(this.destroy$),
        switchMap((res: MemberListResponse) => {
          const members = res.items || [];
          if (members.length === 0) {
            return of([]);
          }

          // Pour chaque membre, charger son rôle (depuis le cache ou via API)
          const roleRequests = members.map((member) => {
            if (this.leaderRoleCache.has(member.id)) {
              return of({ member, roles: this.leaderRoleCache.get(member.id) });
            } else {
              return this.userService.getUserByMemberId(member.id).pipe(
                map((userResponse) => {
                  const roles = userResponse.success ? userResponse.data?.roles ?? [] : [];
                  this.leaderRoleCache.set(member.id, roles);
                  return { member, roles };
                }),
                catchError(() => of({ member, roles: [] }))
              );
            }
          });

          return forkJoin(roleRequests);
        })
      )
      .subscribe({
        next: (results) => {
          this.leaderResults = results
            .filter((item) => (item.roles ?? []).some((r) => responsibleRoles.includes(r)))
            .map((item) => item.member);
          this.searchingLeader.set(false);
          this.showLeaderResults.set(true);
        },
        error: (err) => {
          console.error('❌ Erreur lors de la recherche de responsables:', err);
          this.leaderResults = [];
          this.searchingLeader.set(false);
          this.showLeaderResults.set(false);
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
      siteId: value.siteId || undefined, // ✅ NOUVEAU — omis si vide (cellule pour l'église mère)
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
