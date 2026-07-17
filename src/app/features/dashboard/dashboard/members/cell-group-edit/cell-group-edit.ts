import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import {
  CellGroup,
  CellGroupUpdate,
  WEEK_DAYS,
} from '../../../../../core/models/Members/cell-group.model';
import { Member, MemberListResponse } from '../../../../../core/models/Members/member.model';
import { Members } from '../../../../../core/services/Members/members';
import { Church as ChurchModel } from '../../../../../core/models/Church/church.model';
import { Church as ChurchService } from '../../../../../core/services/Church/church';

@Component({
  selector: 'app-cell-group-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './cell-group-edit.html',
  styleUrl: './cell-group-edit.scss',
})
export class CellGroupEdit implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private leaderSearch$ = new Subject<string>();
  private cellGroupId = '';

  readonly weekDays = WEEK_DAYS;

  loading = signal(true);
  error = signal<string | null>(null);
  saving = signal(false);
  saveSuccess = signal(false);

  cellGroup = signal<CellGroup | null>(null);
  churches = signal<ChurchModel[]>([]);

  // ── Recherche du responsable ──
  leaderResults: Member[] = [];
  searchingLeader = signal(false);
  showLeaderResults = signal(false);
  selectedLeader: Member | null = null;

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private memberService: Members,
    private churchService: ChurchService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      leaderId: ['', Validators.required],
      leaderSearch: [''],
      location: [''],
      meetingDay: [''],
      meetingTime: [''],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.cellGroupId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.cellGroupId) {
      this.error.set('Identifiant de cellule invalide.');
      this.loading.set(false);
      return;
    }

    this.loadChurches();
    this.loadCellGroup();

    this.leaderSearch$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => this.performLeaderSearch(term));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT
  // ───────────────────────────────────────────────────────────────

  private loadChurches(): void {
    this.churchService
      .getChurches({ page: 1, pageSize: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.churches.set(response.data.items);
          }
        },
        error: () => this.churches.set([]),
      });
  }

  private loadCellGroup(): void {
    this.loading.set(true);
    this.error.set(null);

    this.memberService
      .getCellGroupById(this.cellGroupId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cellGroup) => {
          if (cellGroup) {
            this.cellGroup.set(cellGroup);
            this.populateForm(cellGroup);
            this.loadCurrentLeader(cellGroup.leaderId);
          } else {
            this.error.set('Cellule non trouvée.');
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error('❌ Erreur lors du chargement de la cellule:', err);
          this.error.set('Impossible de charger cette cellule.');
          this.loading.set(false);
        },
      });
  }

  private populateForm(cellGroup: CellGroup): void {
    this.form.patchValue({
      name: cellGroup.name,
      leaderId: cellGroup.leaderId,
      leaderSearch: cellGroup.leaderName || '',
      location: cellGroup.location || '',
      meetingDay: cellGroup.meetingDay || '',
      meetingTime: cellGroup.meetingTime || '',
      isActive: cellGroup.isActive,
    }, { emitEvent: false });
  }

  private loadCurrentLeader(leaderId: string | undefined): void {
    if (!leaderId) return;
    this.memberService
      .getMemberById(leaderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (member) => {
          if (member) {
            this.selectedLeader = member;
            this.form.get('leaderSearch')?.setValue(this.getFullName(member), { emitEvent: false });
          }
        },
        error: () => {
          // silencieux : le nom déjà présent sur la cellule reste affiché en fallback
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // RECHERCHE DU RESPONSABLE
  // ───────────────────────────────────────────────────────────────

  onLeaderInput(term: string): void {
    if (this.selectedLeader && term !== this.getFullName(this.selectedLeader)) {
      this.selectedLeader = null;
      this.form.get('leaderId')?.setValue('');
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
          this.leaderResults = res.items || [];
          this.searchingLeader.set(false);
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
    this.form.patchValue({
      leaderId: (member as any).id,
      leaderSearch: this.getFullName(member),
    });
    this.showLeaderResults.set(false);
    this.leaderResults = [];
  }

  clearLeader(): void {
    this.selectedLeader = null;
    this.form.patchValue({ leaderId: '', leaderSearch: '' });
    this.leaderResults = [];
  }

  // ───────────────────────────────────────────────────────────────
  // SOUMISSION
  // ───────────────────────────────────────────────────────────────

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Veuillez corriger les champs invalides.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.saveSuccess.set(false);

    const value = this.form.value;
    const payload: CellGroupUpdate = {
      name: value.name,
      leaderId: value.leaderId,
      location: value.location || undefined,
      meetingDay: value.meetingDay || undefined,
      meetingTime: value.meetingTime || undefined,
      isActive: value.isActive,
    };

    this.memberService
      .updateCellGroup(this.cellGroupId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          // ✅ Réponse à plat, comme le reste du backend
          if (response && (response as any).isSuccess !== false) {
            this.cellGroup.set(response);
            this.saveSuccess.set(true);
            setTimeout(() => this.saveSuccess.set(false), 3000);
          } else {
            this.error.set((response as any)?.errorMessage || 'Erreur lors de la mise à jour.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur lors de la mise à jour de la cellule:', err);
          this.saving.set(false);
          this.error.set('Une erreur est survenue lors de la mise à jour.');
        },
      });
  }

  cancel(): void {
    this.router.navigate(['/dashboard/membres/cellules']);
  }

  // ───────────────────────────────────────────────────────────────
  // HELPERS
  // ───────────────────────────────────────────────────────────────

  getFullName(member: Member): string {
    return (member as any).fullName ?? `${(member as any).firstName} ${(member as any).lastName}`;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  getChurchName(churchId: string | undefined): string {
    if (!churchId) return '—';
    return this.churches().find((c) => c.id === churchId)?.name || '—';
  }
}
