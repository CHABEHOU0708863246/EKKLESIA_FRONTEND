import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Input, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of, catchError } from 'rxjs';
import { Members } from '../../services/Members/members';
import { Users } from '../../services/Users/users';

export interface PickerOption { id: string; label: string; sub?: string; }

/**
 * Sélecteur de membre avec recherche autocomplétée (RG-09 / RG-10 / RG-08).
 * S'utilise avec `formControlName` (ControlValueAccessor) : la valeur est l'id
 * du membre. Les résultats sont filtrés par le périmètre côté serveur.
 * `includePastors` ajoute les pasteurs (utile pour le responsable de cellule).
 */
@Component({
  selector: 'app-member-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MemberSelect), multi: true }],
  template: `
    <div class="ms-field">
      @if (label) { <label class="ms-label">{{ label }}</label> }

      @if (selected(); as s) {
        <div class="ms-chip">
          <span class="ms-chip-name">{{ s.label }}</span>
          @if (s.sub) { <span class="ms-chip-sub">{{ s.sub }}</span> }
          <button type="button" class="ms-chip-x" (click)="clear()" [disabled]="disabled()" aria-label="Retirer">✕</button>
        </div>
      } @else {
        <input class="ms-input" type="text" [(ngModel)]="term" (ngModelChange)="onTerm($event)"
               [placeholder]="placeholder" [disabled]="disabled()" (focus)="open.set(true)" (blur)="onBlur()" />
        @if (open() && (loading() || term.length >= 2)) {
          <div class="ms-dropdown">
            @if (loading()) { <p class="ms-status">Recherche…</p> }
            @else if (results().length === 0) { <p class="ms-status">Aucun résultat</p> }
            @for (o of results(); track o.id) {
              <button type="button" class="ms-item" (mousedown)="choose(o)">
                <span class="ms-item-label">{{ o.label }}</span>
                @if (o.sub) { <span class="ms-item-sub">{{ o.sub }}</span> }
              </button>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .ms-field { position: relative; }
    .ms-label { display: block; font-weight: 600; margin-bottom: 6px; }
    .ms-input { width: 100%; }
    .ms-dropdown {
      position: absolute; z-index: 40; left: 0; right: 0; top: calc(100% + 4px);
      background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
      box-shadow: 0 8px 24px rgba(15,23,42,.12); max-height: 260px; overflow: auto;
    }
    .ms-status { margin: 0; padding: 10px 12px; color: #64748b; font-size: 13px; }
    .ms-item { display: flex; flex-direction: column; gap: 2px; width: 100%; text-align: left; background: none; border: none; padding: 9px 12px; cursor: pointer; }
    .ms-item:hover { background: #f5f3ff; }
    .ms-item-label { font-weight: 600; color: #1f2333; }
    .ms-item-sub { font-size: 12px; color: #64748b; }
    .ms-chip { display: inline-flex; align-items: center; gap: 8px; background: #f1f2f7; border-radius: 999px; padding: 6px 12px; }
    .ms-chip-name { font-weight: 600; }
    .ms-chip-sub { font-size: 12px; color: #64748b; }
    .ms-chip-x { border: none; background: transparent; color: #e04646; cursor: pointer; font-size: 13px; }
  `],
})
export class MemberSelect implements ControlValueAccessor {
  private members = inject(Members);
  private users = inject(Users);
  private host = inject(ElementRef<HTMLElement>);

  @Input() label = '';
  @Input() placeholder = 'Rechercher…';
  @Input() includePastors = false;

  private readonly pastorRoles = ['PASTOR_PRINCIPAL', 'PASTEUR_SITE', 'MINISTRE_BERGER'];

  selected = signal<PickerOption | null>(null);
  results = signal<PickerOption[]>([]);
  loading = signal(false);
  open = signal(false);
  disabled = signal(false);
  term = '';

  private readonly search$ = new Subject<string>();
  private onChangeFn: (value: string | null) => void = () => {};
  private onTouchedFn: () => void = () => {};

  constructor() {
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          if (term.trim().length < 2) { this.results.set([]); return of([] as PickerOption[]); }
          this.loading.set(true);
          const members$ = this.members
            .getMembers({ page: 1, pageSize: 10, fullName: term.trim() } as any)
            .pipe(catchError(() => of({ items: [] } as any)));
          return members$;
        })
      )
      .subscribe((res: any) => {
        const items = res?.items ?? res?.data?.items ?? [];
        const options: PickerOption[] = (items as any[]).map((m) => ({
          id: m.id,
          label: m.fullName || `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim(),
          sub: m.phone,
        }));
        this.loading.set(false);
        this.results.set(options);
      });
  }

  onTerm(value: string): void {
    this.term = value;
    this.open.set(true);
    this.onTouchedFn();
    this.search$.next(value);
  }

  choose(o: PickerOption): void {
    this.selected.set(o);
    this.results.set([]);
    this.open.set(false);
    this.term = '';
    this.onChangeFn(o.id);
  }

  clear(): void {
    this.selected.set(null);
    this.onChangeFn(null);
  }

  onBlur(): void {
    // Laisse le clic sur un résultat se produire avant de fermer.
    setTimeout(() => this.open.set(false), 150);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  writeValue(value: string | null): void {
    if (!value) { this.selected.set(null); return; }
    const known = this.selected();
    if (known && known.id === value) return;

    // Résout le libellé à partir de l'id (best-effort).
    this.selected.set({ id: value, label: 'Membre sélectionné' });
    this.members.getMemberById(value).pipe(catchError(() => of(null))).subscribe((m: any) => {
      const member = m && (m.data ?? m);
      if (member && (member.fullName || member.firstName)) {
        this.selected.set({
          id: value,
          label: member.fullName || `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim(),
          sub: member.phone,
        });
      }
    });
  }

  registerOnChange(fn: (value: string | null) => void): void { this.onChangeFn = fn; }
  registerOnTouched(fn: () => void): void { this.onTouchedFn = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled.set(isDisabled); }
}
