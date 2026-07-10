// src/app/features/dashboard/dashboard/members/cell-group-list/cell-group-list.ts
import { Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, BehaviorSubject } from 'rxjs';

import {
  CellGroup,
  CellGroupCreate,
  CellGroupFilter,
  DEFAULT_CELL_GROUP_FILTER,
  WEEK_DAYS,
  CellGroupUtils,
} from '../../../../../core/models/Members/cell-group.model';
import { Member } from '../../../../../core/models/Members/member.model';
import { Members } from '../../../../../core/services/Members/members';
import { ConfirmDialog } from '../../../../../core/components/confirm-dialog/confirm-dialog';
import { Church } from '../../../../../core/models/Church/church.model';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

@Component({
  selector: 'app-cell-group-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    ConfirmDialog
  ],
  templateUrl: './cell-group-list.html',
  styleUrl: './cell-group-list.scss',
})
export class CellGroupList implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private leaderSearch$ = new Subject<string>();

  readonly weekDays = WEEK_DAYS;
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  // ── Contexte de l'église ──
  private churchSubject = new BehaviorSubject<Church | null>(null);
  currentChurch$ = this.churchSubject.asObservable();
  churches$ = new BehaviorSubject<Church[]>([]);

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

  // ── Panneau de création ──
  showCreatePanel = signal(false);
  creating = signal(false);
  createError = signal<string | null>(null);
  createForm: FormGroup;

  // ── Recherche du leader ──
  leaderResults: Member[] = [];
  searchingLeader = signal(false);
  showLeaderResults = signal(false);
  selectedLeader: Member | null = null;

  // ── Suppression ──
  deleteDialogVisible = signal(false);
  cellGroupToDelete = signal<CellGroup | null>(null);
  deleting = signal(false);

  constructor(
    private fb: FormBuilder,
    private memberService: Members,
    private router: Router
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
    this.loadChurches();
    this.loadCurrentChurchContext();
    this.loadCellGroups();

    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadCellGroups();
      });

    this.dayControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadCellGroups();
      });

    this.statusControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadCellGroups();
      });

    this.leaderSearch$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => this.performLeaderSearch(term));

    this.currentChurch$.pipe(takeUntil(this.destroy$)).subscribe((church) => {
      if (church) {
        this.createForm.patchValue({ churchId: church.id });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ───────────────────────────────────────────────────────────────
  // GESTION DE L'ÉGLISE
  // ───────────────────────────────────────────────────────────────

  loadChurches(): void {
    // TODO: Remplacer par l'appel à votre service d'églises
    // Exemple avec des données mock
    const mockChurches: Church[] = []; // ← Vide pour simuler l'absence d'églises

    // Pour tester avec des données
    // const mockChurches: Church[] = [
    //   { id: 'church_001', name: 'Église Vie Nouvelle - Abidjan' },
    //   { id: 'church_002', name: 'Église Vie Nouvelle - Yamoussoukro' },
    // ];

    this.churches$.next(mockChurches);

    // Si aucune église n'existe, on redirige automatiquement vers la création
    if (mockChurches.length === 0) {
      // Optionnel: Afficher un message ou rediriger
      console.warn('⚠️ Aucune église trouvée dans le système');
    }
  }

  loadCurrentChurchContext(): void {
    // TODO: Récupérer l'église du contexte utilisateur
    // Si l'utilisateur n'a pas d'église et qu'il y a des églises disponibles
    const churches = this.churches$.value;
    if (churches.length > 0) {
      // Option 1: Sélectionner la première église par défaut
      // this.churchSubject.next(churches[0]);

      // Option 2: Récupérer depuis le localStorage
      // const savedChurchId = localStorage.getItem('currentChurchId');
      // const savedChurch = churches.find(c => c.id === savedChurchId);
      // this.churchSubject.next(savedChurch || churches[0]);

      // Option 3: Laisser l'utilisateur choisir
      this.churchSubject.next(null);
    } else {
      this.churchSubject.next(null);
    }
  }

  hasChurchContext(): boolean {
    return this.churchSubject.value !== null;
  }

  openChurchSelector(): void {
    // TODO: Ouvrir un modal de sélection d'église
    console.log('Ouvrir sélecteur d\'église');
  }

  goToCreateChurch(): void {
    // Navigation vers la page de création d'église
    this.router.navigate(['/dashboard/parametres/eglises/creer']);
    // ou selon votre routing
    // this.router.navigate(['/dashboard/churches/create']);
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT DE LA LISTE
  // ───────────────────────────────────────────────────────────────

  loadCellGroups(): void {
    const currentChurch = this.churchSubject.value;

    // Si aucune église n'existe, on ne charge rien
    if (this.churches$.value.length === 0) {
      this.cellGroups.set([]);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.filter = {
      ...DEFAULT_CELL_GROUP_FILTER,
      page: this.currentPage(),
      pageSize: this.pageSize(),
      name: this.searchControl.value || undefined,
      meetingDay: this.dayControl.value || undefined,
      isActive: this.statusControl.value === '' ? undefined : this.statusControl.value === 'true',
    };

    this.memberService
      .getCellGroups(currentChurch?.id, this.filter.isActive)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (groups) => {
          let filtered = groups ?? [];

          if (currentChurch?.id) {
            filtered = filtered.filter(g => g.churchId === currentChurch.id);
          }

          if (this.filter.name) {
            filtered = CellGroupUtils.searchCellGroups(filtered, this.filter.name);
          }
          if (this.filter.meetingDay) {
            filtered = filtered.filter(
              (g) => (g.meetingDay || '').toLowerCase() === this.filter.meetingDay!.toLowerCase()
            );
          }

          this.totalCount.set(filtered.length);

          const start = (this.currentPage() - 1) * this.pageSize();
          this.cellGroups.set(filtered.slice(start, start + this.pageSize()));
          this.loading.set(false);
        },
        error: (err) => {
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
  // PANNEAU DE CRÉATION
  // ───────────────────────────────────────────────────────────────

  openCreatePanel(): void {
    // Vérifier qu'il y a des églises dans le système
    if (this.churches$.value.length === 0) {
      this.createError.set('Aucune église disponible. Veuillez d\'abord créer une église.');
      return;
    }

    const currentChurch = this.churchSubject.value;
    if (!currentChurch) {
      this.createError.set('Veuillez d\'abord sélectionner une église.');
      // Optionnel: ouvrir le sélecteur d'église
      this.openChurchSelector();
      return;
    }

    this.showCreatePanel.set(true);
    this.createError.set(null);
    this.createForm.patchValue({ churchId: currentChurch.id });
  }

  closeCreatePanel(): void {
    this.showCreatePanel.set(false);
    this.createForm.reset({
      name: '',
      leaderId: '',
      location: '',
      meetingDay: '',
      meetingTime: '',
      churchId: this.churchSubject.value?.id || ''
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
        next: (res) => {
          this.leaderResults = (res as any)?.items ?? (res as any) ?? [];
          this.searchingLeader.set(false);
        },
        error: () => {
          this.leaderResults = [];
          this.searchingLeader.set(false);
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
          this.createError.set("Une erreur est survenue lors de la création. Veuillez réessayer.");
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // NAVIGATION / SUPPRESSION
  // ───────────────────────────────────────────────────────────────

  openCellGroup(cellGroup: CellGroup): void {
    this.router.navigate(['/dashboard/membres/cellules', cellGroup.id]);
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

  getInitials(name: string): string {
    return CellGroupUtils.getInitials(name);
  }

  getFullName(member: Member): string {
    return (member as any).fullName ?? `${(member as any).firstName} ${(member as any).lastName}`;
  }

  getStatusBadge(isActive: boolean) {
    return CellGroupUtils.getStatusBadge(isActive);
  }

  getMeetingDayLabel(day?: string): string {
    return CellGroupUtils.getMeetingDayLabel(day);
  }

  getFormattedMeetingTime(time?: string): string {
    return CellGroupUtils.getFormattedMeetingTime(time);
  }
}
