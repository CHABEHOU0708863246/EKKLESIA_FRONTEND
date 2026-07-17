// src/app/features/dashboard/finances/budget/budget-form/budget-form.component.ts

import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, distinctUntilChanged, takeUntil } from 'rxjs';
import { Church as ChurchService } from '../../../../../core/services/Church/church';
import { Church as ChurchModel } from '../../../../../core/models/Church/church.model';
import { Site } from '../../../../../core/models/Church/site.model';
import {
  BudgetStatus,
  BudgetCreate,
  BudgetUpdate,
  BudgetStatusLabels,
  BudgetUtils
} from '../../../../../core/models/Finances/budget.model';
import { BudgetService } from '../../../../../core/services/Finances/budjets';

const STATUS_OPTIONS = Object.values(BudgetStatus).map((value) => ({
  value,
  label: BudgetStatusLabels[value],
}));

@Component({
  selector: 'app-budget-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './budget-form.html',
  styleUrls: ['./budget-form.scss'],
})
export class BudgetForm implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private budgetService = inject(BudgetService);
  private churchService = inject(ChurchService);
  private router = inject(Router);

  // ── Exposé des énumérations ──
  readonly BudgetStatus = BudgetStatus;
  readonly statusOptions = STATUS_OPTIONS;

  // ── État ──
  isEditMode = signal(false);
  budgetId: string | null = null;
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  // ── Listes déroulantes ──
  churches = signal<ChurchModel[]>([]);
  loadingChurches = signal(false);
  sites = signal<Site[]>([]);
  loadingSites = signal(false);

  // ── Formulaire ──
  form: FormGroup;

  // ── Helpers ──
  getStatusLabel = BudgetUtils.getStatusLabel;
  getStatusColor = BudgetUtils.getStatusColor;

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      year: [new Date().getFullYear(), [Validators.required, Validators.min(2000)]],
      churchId: ['', Validators.required],
      siteId: [''],
      status: [BudgetStatus.Draft],
      categories: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.loadChurches();

    // Détection du mode édition
    const urlSegments = this.router.url.split('/');
    if (urlSegments.includes('edit')) {
      this.isEditMode.set(true);
      const idIndex = urlSegments.indexOf('edit') - 1;
      this.budgetId = urlSegments[idIndex] || null;
      if (this.budgetId) {
        this.loadBudgetData(this.budgetId);
      }
    }

    // Réactivité église → sites
    this.form.get('churchId')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((churchId: string) => {
        this.form.get('siteId')?.setValue('');
        this.sites.set([]);
        if (churchId) this.loadSites(churchId);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT DES DONNÉES (édition)
  // ──────────────────────────────────────────────────────────────

  private loadBudgetData(id: string): void {
    this.budgetService.getById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.populateForm(response.data);
        } else {
          this.error.set('Impossible de charger le budget.');
        }
      },
      error: () => this.error.set('Erreur lors du chargement du budget.'),
    });
  }

  private populateForm(budget: any): void {
    this.form.patchValue({
      name: budget.name,
      year: budget.year,
      churchId: budget.churchId,
      siteId: budget.siteId || '',
      status: budget.status || BudgetStatus.Draft,
    });

    // Catégories
    const categoryArray = this.form.get('categories') as FormArray;
    categoryArray.clear();
    budget.categories.forEach((cat: any) => {
      categoryArray.push(this.createCategoryGroup(cat));
    });
    // Ajouter une ligne vide si aucune catégorie
    if (categoryArray.length === 0) {
      this.addCategory();
    }

    if (budget.churchId) {
      this.loadSites(budget.churchId);
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
  // GESTION DES CATÉGORIES
  // ──────────────────────────────────────────────────────────────

  get categoriesArray(): FormArray {
    return this.form.get('categories') as FormArray;
  }

  createCategoryGroup(category?: any): FormGroup {
    return this.fb.group({
      name: [category?.name || '', Validators.required],
      code: [category?.code || ''],
      allocated: [category?.allocated || 0, [Validators.required, Validators.min(0)]],
      spent: [category?.spent || 0, [Validators.min(0)]],
      notes: [category?.notes || ''],
    });
  }

  addCategory(): void {
    const group = this.createCategoryGroup();
    this.categoriesArray.push(group);
  }

  removeCategory(index: number): void {
    if (this.categoriesArray.length > 1) {
      this.categoriesArray.removeAt(index);
    } else {
      this.error.set('Il doit y avoir au moins une catégorie.');
    }
  }

  // ──────────────────────────────────────────────────────────────
  // VALIDATION & SOUMISSION
  // ──────────────────────────────────────────────────────────────

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  isCategoryFieldInvalid(index: number, field: string): boolean {
    const group = this.categoriesArray.at(index);
    if (!group) return false;
    const control = group.get(field);
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
    const categories = raw.categories.map((c: any) => ({
      name: c.name,
      code: c.code || c.name.toUpperCase().replace(/\s/g, '_'),
      allocated: c.allocated || 0,
      spent: c.spent || 0,
      notes: c.notes || '',
    }));

    const payload: BudgetCreate | BudgetUpdate = {
      name: raw.name,
      year: raw.year,
      churchId: raw.churchId,
      siteId: raw.siteId || undefined,
      categories,
      status: raw.status || BudgetStatus.Draft,
    };

    const request$ = this.isEditMode() && this.budgetId
      ? this.budgetService.update(this.budgetId, payload)
      : this.budgetService.create(payload as BudgetCreate);

    request$.subscribe({
      next: (response) => {
        this.saving.set(false);
        if (response.success && response.data) {
          this.success.set(true);
          setTimeout(() => {
            this.success.set(false);
            this.router.navigate(['/dashboard/finances/budget', response.data.id]);
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
    this.router.navigate(['/dashboard/finances/budget']);
  }
}
