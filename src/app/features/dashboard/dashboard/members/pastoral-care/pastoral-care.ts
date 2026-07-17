// src/app/features/dashboard/dashboard/members/pastoral-care/pastoral-care.ts
import { Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
// Import nécessaire pour memberSearchControl (FormControl seul, pas via FormBuilder)
import { FormControl } from '@angular/forms';
import { Members } from '../../../../../core/services/Members/members';
import { Member, DEFAULT_MEMBER_FILTER } from '../../../../../core/models/Members/member.model';
import {
  PastoralNote,
  PastoralNoteCreate,
  PastoralNoteUpdate,
  INTERACTION_TYPES,
  PastoralNoteUtils,
} from '../../../../../core/models/Members/pastoral-note.model';
import { Users } from '../../../../../core/services/Users/users';

type ViewMode = 'timeline' | 'planning';

@Component({
  selector: 'app-pastoral-care',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './pastoral-care.html',
  styleUrl: './pastoral-care.scss',
})
export class PastoralCare implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private currentUserId: string | null = null;
  loadingCurrentUser = signal(true);

  readonly interactionTypes = INTERACTION_TYPES;

  // ── Sélection du membre ──
  memberSearchControl = new FormControl<string>('');
  memberResults = signal<Member[]>([]);
  searchingMember = signal(false);
  selectedMember = signal<Member | null>(null);

  // ── Notes du membre sélectionné ──
  notes = signal<PastoralNote[]>([]);
  loadingNotes = signal(false);
  error = signal<string | null>(null);

  // ── Confidentialité ──
  includeConfidential = signal(false);

  // ── Vue active ──
  viewMode = signal<ViewMode>('timeline');

  // ── Formulaire de création/édition ──
  showForm = signal(false);
  editingNoteId = signal<string | null>(null);
  saving = signal(false);
  formError = signal<string | null>(null);
  form: FormGroup;

  // ── Suppression ──
  deletingId = signal<string | null>(null);

  // ── Dérivés ──
  sortedNotes = computed(() =>
    [...this.notes()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  );

  upcomingFollowUps = computed(() =>
    this.notes()
      .filter((n) => !!n.followUpDate)
      .sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime())
  );

  overdueCount = computed(() =>
    this.upcomingFollowUps().filter((n) => PastoralNoteUtils.getIsFollowUpNeeded(n)).length
  );

  constructor(
    private fb: FormBuilder,
    private memberService: Members,
     private userService: Users
  ) {
    this.form = this.fb.group({
      interactionType: ['Visite', Validators.required],
      date: ['', Validators.required],
      summary: ['', [Validators.required, Validators.minLength(5)]],
      prayerRequests: [''], // saisi en texte multi-lignes, converti en tableau
      followUpDate: [''],
      isConfidential: [true],
    });
  }

  ngOnInit(): void {
     this.loadCurrentUser();
    this.memberSearchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => {
        if (term && term.trim().length >= 2) {
          this.searchMembers(term.trim());
        } else {
          this.memberResults.set([]);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCurrentUser(): void {
    this.userService
      .getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.currentUserId = response.data.id;
          } else {
            this.error.set("Impossible d'identifier l'utilisateur connecté. La création de notes pastorales sera indisponible.");
          }
          this.loadingCurrentUser.set(false);
        },
        error: () => {
          this.error.set("Impossible d'identifier l'utilisateur connecté.");
          this.loadingCurrentUser.set(false);
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // SÉLECTION DU MEMBRE
  // ───────────────────────────────────────────────────────────────

  private searchMembers(term: string): void {
    this.searchingMember.set(true);
    this.memberService
      .getMembers({ ...DEFAULT_MEMBER_FILTER, fullName: term, pageSize: 8 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const items = response?.items ?? [];
          this.memberResults.set(items);
          this.searchingMember.set(false);
        },
        error: () => {
          this.memberResults.set([]);
          this.searchingMember.set(false);
        },
      });
  }

  selectMember(member: Member): void {
    this.selectedMember.set(member);
    this.memberResults.set([]);
    this.memberSearchControl.setValue('', { emitEvent: false });
    this.showForm.set(false);
    this.loadNotes();
  }

  changeMember(): void {
    this.selectedMember.set(null);
    this.notes.set([]);
    this.showForm.set(false);
    this.error.set(null);
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT DES NOTES
  // ───────────────────────────────────────────────────────────────

  loadNotes(): void {
    const member = this.selectedMember();
    if (!member) return;

    this.loadingNotes.set(true);
    this.error.set(null);

    this.memberService
      .getPastoralNotesByMember(member.id, this.includeConfidential())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notes) => {
          this.notes.set(notes ?? []);
          this.loadingNotes.set(false);
        },
        error: (err) => {
          console.error('❌ Erreur lors du chargement des notes pastorales:', err);
          this.notes.set([]);
          this.loadingNotes.set(false);
          this.error.set('Impossible de charger les notes pastorales de ce membre.');
        },
      });
  }

  toggleConfidential(): void {
    this.includeConfidential.update((v) => !v);
    this.loadNotes();
  }

  // ───────────────────────────────────────────────────────────────
  // CRÉATION / ÉDITION
  // ───────────────────────────────────────────────────────────────

  openCreateForm(): void {
    this.editingNoteId.set(null);
    this.form.reset({
      interactionType: 'Visite',
      date: this.toDateTimeInputValue(new Date().toISOString()),
      summary: '',
      prayerRequests: '',
      followUpDate: '',
      isConfidential: true,
    });
    this.formError.set(null);
    this.showForm.set(true);
  }

  openEditForm(note: PastoralNote): void {
    this.editingNoteId.set(note.id);
    this.form.patchValue({
      interactionType: note.interactionType,
      date: this.toDateTimeInputValue(note.date),
      summary: note.summary,
      prayerRequests: (note.prayerRequests || []).join('\n'),
      followUpDate: note.followUpDate ? this.toDateInputValue(note.followUpDate) : '',
      isConfidential: note.isConfidential,
    });
    this.formError.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingNoteId.set(null);
    this.formError.set(null);
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  submitForm(): void {
  const member = this.selectedMember();
  if (!member) return;

  // ✅ NOUVEAU — sécurité : impossible de créer une note sans pasteur identifié
  if (!this.editingNoteId() && !this.currentUserId) {
    this.formError.set("Impossible d'identifier le pasteur connecté. Veuillez rafraîchir la page.");
    return;
  }

  if (this.form.invalid) {
    this.form.markAllAsTouched();
    this.formError.set('Veuillez corriger les champs invalides.');
    return;
  }

  this.saving.set(true);
  this.formError.set(null);

  const value = this.form.value;
  const prayerRequests = (value.prayerRequests || '')
    .split('\n')
    .map((p: string) => p.trim())
    .filter((p: string) => p.length > 0);

  const editingId = this.editingNoteId();

  if (editingId) {
    const payload: PastoralNoteUpdate = {
      interactionType: value.interactionType,
      date: value.date,
      summary: value.summary.trim(),
      prayerRequests,
      followUpDate: value.followUpDate || undefined,
      isConfidential: value.isConfidential,
    };

    this.memberService
      .updatePastoralNote(editingId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => this.handleSaveResponse(response),
        error: (err) => this.handleSaveError(err),
      });
  } else {
    const payload: PastoralNoteCreate = {
      memberId: member.id,
      pastorId: this.currentUserId!, // ✅ CORRIGÉ — plus jamais vide grâce à la garde ci-dessus
      interactionType: value.interactionType,
      date: value.date,
      summary: value.summary.trim(),
      prayerRequests,
      followUpDate: value.followUpDate || undefined,
      isConfidential: value.isConfidential,
    };

    this.memberService
      .createPastoralNote(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => this.handleSaveResponse(response),
        error: (err) => this.handleSaveError(err),
      });
  }
}

  private handleSaveResponse(response: PastoralNote): void {
    this.saving.set(false);
    // ✅ Réponse à plat : isSuccess directement sur l'objet
    if (response && response.isSuccess !== false) {
      this.closeForm();
      this.loadNotes();
    } else {
      this.formError.set(response?.errorMessage || "Erreur lors de l'enregistrement.");
    }
  }

  private handleSaveError(err: any): void {
    console.error('❌ Erreur lors de l\'enregistrement de la note:', err);
    this.saving.set(false);
    this.formError.set(err?.error?.message || 'Une erreur est survenue.');
  }

  // ───────────────────────────────────────────────────────────────
  // SUPPRESSION
  // ───────────────────────────────────────────────────────────────

  deleteNote(note: PastoralNote): void {
    if (!confirm('Supprimer définitivement cette note pastorale ? Cette action est irréversible.')) return;

    this.deletingId.set(note.id);
    this.memberService
      .deletePastoralNote(note.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deletingId.set(null);
          this.loadNotes();
        },
        error: (err) => {
          console.error('❌ Erreur lors de la suppression:', err);
          this.deletingId.set(null);
          this.error.set('Impossible de supprimer cette note.');
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // NAVIGATION VUE
  // ───────────────────────────────────────────────────────────────

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  // ───────────────────────────────────────────────────────────────
  // HELPERS D'AFFICHAGE
  // ───────────────────────────────────────────────────────────────

  getMemberInitials(member: Member): string {
    const f = member.firstName?.charAt(0) || '?';
    const l = member.lastName?.charAt(0) || '?';
    return `${f}${l}`.toUpperCase();
  }

  getMemberFullName(member: Member): string {
    return member.fullName || `${member.firstName} ${member.lastName}`;
  }

  formatDate(date: string): string {
    return PastoralNoteUtils.getFormattedDate(date);
  }

  formatDateOnly(date?: string): string {
    return PastoralNoteUtils.getFormattedDateOnly(date);
  }

  getInteractionTypeLabel(type: string): string {
    return PastoralNoteUtils.getInteractionTypeLabel(type);
  }

  getInteractionTypeColor(type: string): string {
    return PastoralNoteUtils.getInteractionTypeColor(type);
  }

  getInteractionTypeClass(type: string): string {
    return `pc-type-badge pc-type-badge--${this.getInteractionTypeColor(type)}`;
  }

  getFollowUpStatus(note: PastoralNote) {
    return PastoralNoteUtils.getFollowUpStatus(note);
  }

  getFollowUpStatusClass(note: PastoralNote): string {
    return `pc-followup-badge pc-followup-badge--${this.getFollowUpStatus(note).color}`;
  }

  private toDateTimeInputValue(date: string): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 16);
  }

  private toDateInputValue(date: string): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }
}

