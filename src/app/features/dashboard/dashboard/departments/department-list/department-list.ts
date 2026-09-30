import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Departments, Department } from '../../../../../core/services/Departments/departments';
import { Members } from '../../../../../core/services/Members/members';
import { Notification } from '../../../../../core/services/Notification/notification';

interface MemberOption {
  id: string;
  fullName: string;
}

/**
 * Départements / ministères (Lot 9) : liste, création, affectation d'un membre
 * via une liste déroulante (plus aucun ID saisi en dur).
 */
@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dp-page">
      <h1>Départements</h1>

      <div class="miav-card dp-create">
        <input class="miav-input" [(ngModel)]="newName" placeholder="Nom du département (ex. Louange)" />
        <input class="miav-input" [(ngModel)]="newDesc" placeholder="Description (optionnel)" />
        <button class="miav-btn miav-btn--primary" (click)="create()" [disabled]="!newName">Créer</button>
      </div>

      <div class="dp-grid">
        @for (d of departments(); track d.id) {
          <div class="miav-card dp-card">
            <div class="dp-card-head">
              <strong>{{ d.name }}</strong>
              <button class="miav-btn miav-btn--ghost" (click)="remove(d)">Supprimer</button>
            </div>
            @if (d.description) { <p class="dp-desc">{{ d.description }}</p> }
            <p class="dp-count">{{ d.memberCount }} membre(s)</p>

            <div class="dp-members">
              <span class="dp-members-title">Membres affectés</span>
              @if (d.members.length === 0) {
                <span class="dp-empty">Aucun membre affecté.</span>
              }
              @for (m of d.members; track m.id) {
                <span class="dp-chip">
                  {{ m.fullName }}
                  <button class="dp-chip-x" (click)="unassign(d, m.id)" aria-label="Retirer">×</button>
                </span>
              }
            </div>

            <div class="dp-assign">
              <select class="miav-input" [(ngModel)]="assignSelection[d.id]">
                <option value="">— Affecter un membre —</option>
                @for (m of memberOptions(); track m.id) {
                  <option [value]="m.id">{{ m.fullName }}</option>
                }
              </select>
              <button class="miav-btn miav-btn--accent" (click)="assign(d)"
                      [disabled]="!assignSelection[d.id]">Affecter</button>
            </div>
          </div>
        } @empty {
          <div class="miav-empty">
            <i class="bx bx-buildings"></i>
            <strong>Aucun département</strong>
            <span>Créez un premier département (Louange, Médias, Accueil…).</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .dp-page { max-width: 960px; margin: 0 auto; padding: 24px 16px; }
    .dp-create { display: flex; gap: 10px; padding: 16px; flex-wrap: wrap; }
    .dp-create .miav-input { flex: 1; min-width: 200px; }
    .dp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; margin-top: 16px; }
    .dp-card { padding: 14px; }
    .dp-card-head { display: flex; justify-content: space-between; align-items: center; }
    .dp-desc, .dp-count { color: var(--color-muted); margin: 6px 0; }
    .dp-members { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; align-items: center; }
    .dp-members-title { font-size: 12px; color: var(--color-muted); width: 100%; }
    .dp-empty { font-size: 12px; color: var(--color-muted); }
    .dp-chip { display: inline-flex; align-items: center; gap: 4px; background: var(--color-surface, #f1f2f7); border-radius: 999px; padding: 2px 10px; font-size: 12px; }
    .dp-chip-x { border: none; background: transparent; cursor: pointer; font-size: 14px; line-height: 1; color: var(--color-danger, #e04646); }
    .dp-assign { display: flex; gap: 8px; margin-top: 8px; }
    .dp-assign select { flex: 1; }
  `],
})
export class DepartmentList implements OnInit {
  private service = inject(Departments);
  private membersService = inject(Members);
  private notification = inject(Notification);

  departments = signal<Department[]>([]);
  memberOptions = signal<MemberOption[]>([]);
  newName = '';
  newDesc = '';
  assignSelection: Record<string, string> = {};

  ngOnInit(): void {
    this.load();
    this.loadMembers();
  }

  private load(): void {
    this.service.getAll().subscribe({ next: (r) => this.departments.set(r?.data ?? []) });
  }

  private loadMembers(): void {
    this.membersService
      .getMembers({ page: 1, pageSize: 500, sortBy: 'firstName', sortOrder: 'asc' })
      .subscribe({
        next: (res: any) => {
          const items: any[] = res?.items ?? res?.data?.items ?? [];
          this.memberOptions.set(
            items.map((m) => ({
              id: m.id,
              fullName: m.fullName || `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim(),
            }))
          );
        },
        error: () => this.memberOptions.set([]),
      });
  }

  create(): void {
    this.service.create({ name: this.newName, description: this.newDesc || undefined }).subscribe({
      next: () => {
        this.newName = '';
        this.newDesc = '';
        this.notification.success('Département créé', '');
        this.load();
      },
    });
  }

  remove(d: Department): void {
    this.service.delete(d.id).subscribe({ next: () => this.load() });
  }

  assign(d: Department): void {
    const memberId = (this.assignSelection[d.id] || '').trim();
    if (!memberId) return;
    this.service.assignMember(d.id, memberId).subscribe({
      next: () => {
        this.assignSelection[d.id] = '';
        this.notification.success('Membre affecté', '');
        this.load();
      },
      error: () => this.notification.error('Erreur', 'Membre introuvable ou affectation impossible.'),
    });
  }

  unassign(d: Department, memberId: string): void {
    this.service.removeMember(d.id, memberId).subscribe({
      next: () => {
        this.notification.success('Membre retiré', '');
        this.load();
      },
      error: () => this.notification.error('Erreur', 'Retrait impossible.'),
    });
  }
}
