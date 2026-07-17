// src/app/features/dashboard/finances/expenses/expense-form/expense-form.component.ts

import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { Members } from '../../../../../core/services/Members/members';
import { Church as ChurchService } from '../../../../../core/services/Church/church';
import { Users } from '../../../../../core/services/Users/users';

import {
  ExpenseCategory,
  ExpenseStatus,
  PaymentMethod,
  ExpenseCreate,
  ExpenseUpdate,
  ExpenseCategoryLabels,
  ExpenseCategoryIcons,
  ExpenseStatusLabels,
  PaymentMethodLabels
} from '../../../../../core/models/Finances/expense.model';

import { Church as ChurchModel } from '../../../../../core/models/Church/church.model';
import { Site } from '../../../../../core/models/Church/site.model';
import { Member } from '../../../../../core/models/Members/member.model';
import { User } from '../../../../../core/models/Users/user.model';
import { Expenses } from '../../../../../core/services/Finances/expenses';

const CATEGORY_OPTIONS = Object.values(ExpenseCategory).map((value) => ({
  value,
  label: ExpenseCategoryLabels[value],
  icon: ExpenseCategoryIcons[value],
}));

const PAYMENT_METHODS = Object.values(PaymentMethod).map((value) => ({
  value,
  label: PaymentMethodLabels[value],
}));

const STATUS_OPTIONS = Object.values(ExpenseStatus).map((value) => ({
  value,
  label: ExpenseStatusLabels[value],
}));

@Component({
  selector: 'app-expense-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './expense-form.html',
  styleUrls: ['./expense-form.scss'],
})
export class ExpenseForm implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private expensesService = inject(Expenses);
  private memberService = inject(Members);
  private churchService = inject(ChurchService);
  private userService = inject(Users);
  private router = inject(Router);

  // ── Exposé des énumérations au template ──
  readonly ExpenseStatus = ExpenseStatus;
  readonly ExpenseCategory = ExpenseCategory;
  readonly PaymentMethod = PaymentMethod;
  readonly categoryOptions = CATEGORY_OPTIONS;
  readonly paymentMethods = PAYMENT_METHODS;
  readonly statusOptions = STATUS_OPTIONS;

  // ── État ──
  isEditMode = signal(false);
  expenseId: string | null = null;
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  // ── Listes déroulantes ──
  churches = signal<ChurchModel[]>([]);
  loadingChurches = signal(false);
  sites = signal<Site[]>([]);
  loadingSites = signal(false);

  // ── Recherche de demandeur ──
  searchingRequester = signal(false);
  showRequesterResults = signal(false);
  requesterResults = signal<(Member | User)[]>([]);
  selectedRequester = signal<Member | User | null>(null);

  form: FormGroup;

  // ── Helpers ──
  getStatusLabel(status: ExpenseStatus): string {
    return ExpenseStatusLabels[status] || status;
  }

  getCategoryLabel(category: ExpenseCategory): string {
    return ExpenseCategoryLabels[category] || category;
  }

  getPaymentMethodLabel(method: PaymentMethod): string {
    return PaymentMethodLabels[method] || method;
  }

  /**
 * Récupère l'ID d'un demandeur (membre ou utilisateur)
 */
getRequesterId(person: any): string {
  return person?.id || '';
}

  constructor() {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      amount: [0, [Validators.required, Validators.min(1)]],
      currency: ['FCFA', Validators.required],
      category: [ExpenseCategory.Other, Validators.required],
      date: ['', Validators.required],
      churchId: ['', Validators.required],
      siteId: [''],
      requestedBy: ['', Validators.required],
      requesterSearch: [''],
      paymentMethod: [PaymentMethod.Cash, Validators.required],
      reference: [''],
      budgetCode: [''],
      status: [ExpenseStatus.Pending],
      receiptUrl: [''],
    });
  }

  ngOnInit(): void {
    this.loadChurches();

    // Détection du mode édition
    const urlSegments = this.router.url.split('/');
    if (urlSegments.includes('edit')) {
      this.isEditMode.set(true);
      const idIndex = urlSegments.indexOf('edit') - 1;
      this.expenseId = urlSegments[idIndex] || null;
      if (this.expenseId) {
        this.loadExpenseData(this.expenseId);
      }
    }

    // ── Réactivité église → sites ──
    this.form.get('churchId')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((churchId: string) => {
        this.form.get('siteId')?.setValue('');
        this.sites.set([]);
        if (churchId) this.loadSites(churchId);
      });

    // ── Recherche de demandeur ──
    this.form.get('requesterSearch')?.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term: string) => {
        if (term && term.trim().length >= 2) {
          this.searchRequester(term.trim());
        } else {
          this.requesterResults.set([]);
          this.showRequesterResults.set(false);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT DES DONNÉES (édition)
  // ──────────────────────────────────────────────────────────────

  private loadExpenseData(id: string): void {
    this.expensesService.getById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.populateForm(response.data);
        } else {
          this.error.set('Impossible de charger la dépense.');
        }
      },
      error: () => this.error.set('Erreur lors du chargement de la dépense.'),
    });
  }

  private populateForm(expense: any): void {
    this.form.patchValue({
      title: expense.title,
      description: expense.description || '',
      amount: expense.amount,
      currency: expense.currency || 'FCFA',
      category: expense.category,
      date: this.formatDateInput(expense.date),
      churchId: expense.churchId,
      siteId: expense.siteId || '',
      requestedBy: expense.requestedBy,
      requesterSearch: expense.requestedByName || '',
      paymentMethod: expense.paymentMethod || PaymentMethod.Cash,
      reference: expense.reference || '',
      budgetCode: expense.budgetCode || '',
      status: expense.status || ExpenseStatus.Pending,
      receiptUrl: expense.receiptUrl || '',
    });

    if (expense.requestedBy) {
      this.selectedRequester.set({
        id: expense.requestedBy,
        fullName: expense.requestedByName || expense.requestedBy,
      } as any);
    }

    if (expense.churchId) {
      this.loadSites(expense.churchId);
    }
  }

  private formatDateInput(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT DES LISTES
  // ──────────────────────────────────────────────────────────────

  private loadChurches(): void {
    this.loadingChurches.set(true);
    this.churchService.getAllChurches().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.churches.set(response.data as any);
        }
        this.loadingChurches.set(false);
      },
      error: () => this.loadingChurches.set(false),
    });
  }

  private loadSites(churchId: string): void {
    this.loadingSites.set(true);
    this.churchService.getSitesByChurchId(churchId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.sites.set(response.data as any);
        }
        this.loadingSites.set(false);
      },
      error: () => this.loadingSites.set(false),
    });
  }

  // ──────────────────────────────────────────────────────────────
  // RECHERCHE DE DEMANDEUR (Membre ou Utilisateur)
  // ──────────────────────────────────────────────────────────────

  private searchRequester(term: string): void {
    this.searchingRequester.set(true);
    this.showRequesterResults.set(true);

    // Chercher d'abord dans les membres
    this.memberService
      .getMembers({ page: 1, pageSize: 8, fullName: term } as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const members = (response as any)?.items || [];
          // Si des membres sont trouvés, les afficher
          if (members.length > 0) {
            this.requesterResults.set(members);
            this.searchingRequester.set(false);
            return;
          }
          // Sinon, chercher dans les utilisateurs
          this.userService
            .getUsers({ page: 1, pageSize: 8, fullName: term } as any)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (userResponse) => {
                const users = (userResponse as any)?.items || [];
                this.requesterResults.set(users);
                this.searchingRequester.set(false);
              },
              error: () => {
                this.requesterResults.set([]);
                this.searchingRequester.set(false);
              },
            });
        },
        error: () => {
          this.requesterResults.set([]);
          this.searchingRequester.set(false);
        },
      });
  }

  selectRequester(person: Member | User): void {
    this.selectedRequester.set(person);
    const fullName = (person as any).fullName || `${(person as any).firstName} ${(person as any).lastName}`.trim();
    this.form.patchValue({
      requestedBy: (person as any).id,
      requesterSearch: fullName,
    });
    this.showRequesterResults.set(false);
    this.requesterResults.set([]);
  }

  clearRequester(): void {
    this.selectedRequester.set(null);
    this.form.patchValue({ requestedBy: '', requesterSearch: '' });
  }

  getRequesterFullName(person: Member | User): string {
    if ((person as any).fullName) return (person as any).fullName;
    return `${(person as any).firstName || ''} ${(person as any).lastName || ''}`.trim();
  }

  getRequesterInitials(person: Member | User): string {
    const first = (person as any).firstName?.charAt(0) || '?';
    const last = (person as any).lastName?.charAt(0) || '?';
    return `${first}${last}`.toUpperCase();
  }

  // ──────────────────────────────────────────────────────────────
  // VALIDATION / SOUMISSION
  // ──────────────────────────────────────────────────────────────

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Veuillez corriger les champs invalides.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const raw = this.form.value;

    const payload: ExpenseCreate | ExpenseUpdate = {
      title: raw.title,
      description: raw.description || undefined,
      amount: raw.amount,
      currency: raw.currency,
      category: raw.category,
      date: raw.date,
      churchId: raw.churchId,
      siteId: raw.siteId || undefined,
      requestedBy: raw.requestedBy,
      paymentMethod: raw.paymentMethod,
      reference: raw.reference || undefined,
      budgetCode: raw.budgetCode || undefined,
      status: raw.status || ExpenseStatus.Pending,
      receiptUrl: raw.receiptUrl || undefined,
    };

    const request$ = this.isEditMode() && this.expenseId
      ? this.expensesService.update(this.expenseId, payload)
      : this.expensesService.create(payload as ExpenseCreate);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.saving.set(false);
        if (response.success && response.data) {
          this.success.set(true);
          setTimeout(() => {
            this.success.set(false);
            this.router.navigate(['/dashboard/finances/depenses', response.data.id]);
          }, 1000);
        } else {
          this.error.set(response.message || 'Erreur lors de l\'enregistrement.');
        }
      },
      error: (err) => {
        console.error('❌ Erreur:', err);
        this.saving.set(false);
        this.error.set('Une erreur est survenue.');
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/dashboard/finances/depenses']);
  }
}
