// src/app/features/dashboard/dashboard/members/visitor-pipeline/visitor-pipeline.ts
import { Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { Member } from '../../../../../core/models/Members/member.model';
import { Members } from '../../../../../core/services/Members/members';

// ── Colonnes du pipeline, dans l'ordre métier ──
const STAGE_ORDER = ['FirstContact', 'Invited', 'InClass', 'Adhered'] as const;
type StageKey = (typeof STAGE_ORDER)[number];

interface StageColumn {
  key: StageKey;
  label: string;
  hint: string;
  colorClass: string;
}

const STAGE_COLUMNS: StageColumn[] = [
  { key: 'FirstContact', label: '1er contact', hint: 'Visiteur repéré, pas encore recontacté', colorClass: 'vp-col--sapphire' },
  { key: 'Invited', label: 'Invitation', hint: 'Invité à un culte, une cellule ou un événement', colorClass: 'vp-col--gold' },
  { key: 'InClass', label: 'Cours', hint: 'Suit le parcours de nouveaux ou la catéchèse', colorClass: 'vp-col--violet' },
  { key: 'Adhered', label: 'Béréhin', hint: 'A rejoint officiellement la communauté', colorClass: 'vp-col--emerald' },
];

@Component({
  selector: 'app-visitor-pipeline',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './visitor-pipeline.html',
  styleUrl: './visitor-pipeline.scss',
})
export class VisitorPipeline implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  readonly stageColumns = STAGE_COLUMNS;
  readonly stageOrder = STAGE_ORDER;

  searchControl = new FormControl('');

  visitors = signal<Member[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // ── ID du membre en cours de déplacement (pour l'état visuel + éviter double clic) ──
  movingMemberId = signal<string | null>(null);

  // ── Drag & drop ──
  draggedMemberId = signal<string | null>(null);
  dragOverStage = signal<StageKey | null>(null);

  private searchTerm = signal('');

  // ── Colonnes calculées à partir de la liste filtrée ──
  filteredVisitors = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.visitors();
    return this.visitors().filter((m) => {
      const name = this.getFullName(m).toLowerCase();
      const phone = ((m as any).phone ?? '').toLowerCase();
      return name.includes(term) || phone.includes(term);
    });
  });

  columnsData = computed(() => {
    const list = this.filteredVisitors();
    const map: Record<StageKey, Member[]> = {
      FirstContact: [],
      Invited: [],
      InClass: [],
      Adhered: [],
    };
    for (const m of list) {
      const stage = ((m as any).visitorStage ?? 'FirstContact') as StageKey;
      if (map[stage]) {
        map[stage].push(m);
      } else {
        map.FirstContact.push(m);
      }
    }
    return map;
  });

  totalVisitors = computed(() => this.filteredVisitors().length);

  constructor(
    private memberService: Members,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadVisitors();

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => this.searchTerm.set(term ?? ''));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT
  // ───────────────────────────────────────────────────────────────

  loadVisitors(): void {
    this.loading.set(true);
    this.error.set(null);

    this.memberService
      .getVisitorsByStage(undefined, undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => {
          this.visitors.set(list ?? []);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('❌ Erreur lors du chargement des visiteurs:', err);
          this.error.set('Impossible de charger le pipeline des visiteurs.');
          this.loading.set(false);
        },
      });
  }

  refresh(): void {
    this.loadVisitors();
  }

  // ───────────────────────────────────────────────────────────────
  // CHANGEMENT D'ÉTAPE (boutons)
  // ───────────────────────────────────────────────────────────────

  canMoveBack(member: Member): boolean {
    const idx = this.stageIndexOf(member);
    return idx > 0;
  }

  canMoveForward(member: Member): boolean {
    const idx = this.stageIndexOf(member);
    return idx >= 0 && idx < STAGE_ORDER.length - 1;
  }

  moveBack(member: Member, event: Event): void {
    event.stopPropagation();
    const idx = this.stageIndexOf(member);
    if (idx <= 0) return;
    this.updateStage(member, STAGE_ORDER[idx - 1]);
  }

  moveForward(member: Member, event: Event): void {
    event.stopPropagation();
    const idx = this.stageIndexOf(member);
    if (idx < 0 || idx >= STAGE_ORDER.length - 1) return;
    this.updateStage(member, STAGE_ORDER[idx + 1]);
  }

  private stageIndexOf(member: Member): number {
    const stage = (member as any).visitorStage as StageKey | undefined;
    return stage ? STAGE_ORDER.indexOf(stage) : 0;
  }

  private updateStage(member: Member, newStage: StageKey): void {
    const id = (member as any).id;
    this.movingMemberId.set(id);

    this.memberService
      .updateVisitorStage(id, newStage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.visitors.update((list) =>
            list.map((m) => ((m as any).id === id ? updated : m))
          );
          this.movingMemberId.set(null);

          // Si le visiteur vient d'atteindre "Adhered", son status backend
          // passe normalement à Adherent — on le retire donc du pipeline visiteurs.
          if (newStage === 'Adhered') {
            setTimeout(() => {
              this.visitors.update((list) => list.filter((m) => (m as any).id !== id));
            }, 900);
          }
        },
        error: (err) => {
          console.error('❌ Erreur lors du changement d’étape:', err);
          this.movingMemberId.set(null);
          this.error.set('Impossible de faire progresser ce visiteur.');
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // DRAG & DROP (natif HTML5)
  // ───────────────────────────────────────────────────────────────

  onDragStart(member: Member, event: DragEvent): void {
    this.draggedMemberId.set((member as any).id);
    event.dataTransfer?.setData('text/plain', (member as any).id);
    event.dataTransfer!.effectAllowed = 'move';
  }

  onDragEnd(): void {
    this.draggedMemberId.set(null);
    this.dragOverStage.set(null);
  }

  onColumnDragOver(stage: StageKey, event: DragEvent): void {
    event.preventDefault();
    this.dragOverStage.set(stage);
  }

  onColumnDragLeave(stage: StageKey): void {
    if (this.dragOverStage() === stage) {
      this.dragOverStage.set(null);
    }
  }

  onColumnDrop(stage: StageKey, event: DragEvent): void {
    event.preventDefault();
    this.dragOverStage.set(null);

    const id = this.draggedMemberId();
    this.draggedMemberId.set(null);
    if (!id) return;

    const member = this.visitors().find((m) => (m as any).id === id);
    if (!member) return;

    const currentStage = (member as any).visitorStage as StageKey | undefined;
    if (currentStage === stage) return; // pas de déplacement réel

    this.updateStage(member, stage);
  }

  // ───────────────────────────────────────────────────────────────
  // NAVIGATION
  // ───────────────────────────────────────────────────────────────

  openMember(member: Member): void {
    this.router.navigate(['/dashboard/membres', (member as any).id]);
  }

  // ───────────────────────────────────────────────────────────────
  // HELPERS D'AFFICHAGE
  // ───────────────────────────────────────────────────────────────

  getInitials(member: Member): string {
    const f = (member as any).firstName ?? '?';
    const l = (member as any).lastName ?? '?';
    return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
  }

  getFullName(member: Member): string {
    return (member as any).fullName ?? `${(member as any).firstName} ${(member as any).lastName}`;
  }

  getDaysInStage(member: Member): number {
    const updatedAt = (member as any).updatedAt ?? (member as any).createdAt;
    if (!updatedAt) return 0;
    const diffMs = Date.now() - new Date(updatedAt).getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  isStale(member: Member): boolean {
    // Signalement visuel si un visiteur stagne plus de 14 jours dans la même étape
    return this.getDaysInStage(member) > 14;
  }
}
