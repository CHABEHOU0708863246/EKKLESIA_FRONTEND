// src/app/features/dashboard/services/service-attendance/service-attendance.component.ts

import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ServiceUtils } from '../../../../../core/models/Events/service.model';
import { Service } from '../../../../../core/services/Worship/service';

@Component({
  selector: 'app-service-attendance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './service-attendance.html',
  styleUrls: ['./service-attendance.scss'],
})
export class ServiceAttendance implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private serviceService = inject(Service);

  service = signal<any | null>(null);
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  form: FormGroup;
  Math = Math;

  getStatusLabel = ServiceUtils.getStatusLabel;
  getStatusColor = ServiceUtils.getStatusColor;
  getFormattedDate = ServiceUtils.getFormattedDate;
  getTotalAttendance = ServiceUtils.getTotalAttendance;

  constructor() {
    this.form = this.fb.group({
      members: [0, [Validators.min(0)]],
      visitors: [0, [Validators.min(0)]],
      children: [0, [Validators.min(0)]],
      visitorNames: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Identifiant du culte manquant.');
      this.loading.set(false);
      return;
    }
    this.loadService(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Chargement du culte ──

  private loadService(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.serviceService
      .getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          let data = null;
          if (response && typeof response === 'object') {
            if (response.success && response.data) {
              data = response.data;
            } else if (response.id) {
              data = response;
            }
          }
          if (data) {
            this.service.set(data);
            this.populateForm(data);
          } else {
            this.error.set('Impossible de charger ce culte.');
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error('❌ Erreur:', err);
          this.error.set('Erreur lors du chargement.');
          this.loading.set(false);
        },
      });
  }

  private populateForm(service: any): void {
    const attendance = service.attendance || { members: 0, visitors: 0, children: 0, visitorNames: [] };
    this.form.patchValue({
      members: attendance.members || 0,
      visitors: attendance.visitors || 0,
      children: attendance.children || 0,
    });

    // Remplir le FormArray des visiteurs
    const visitorNamesArray = this.form.get('visitorNames') as FormArray;
    visitorNamesArray.clear();
    (attendance.visitorNames || []).forEach((name: string) => {
      visitorNamesArray.push(this.fb.control(name, Validators.required));
    });
    // Ajouter un champ vide si la liste est vide pour permettre la saisie
    if (visitorNamesArray.length === 0) {
      this.addVisitorField();
    }
  }

  // ── Gestion des visiteurs ──

  get visitorNamesArray(): FormArray {
    return this.form.get('visitorNames') as FormArray;
  }

  addVisitorField(): void {
    this.visitorNamesArray.push(this.fb.control('', Validators.required));
  }

  removeVisitorField(index: number): void {
    if (this.visitorNamesArray.length > 1) {
      this.visitorNamesArray.removeAt(index);
    }
  }

  // ── Calcul du total ──

  get total(): number {
    const members = this.form.get('members')?.value || 0;
    const visitors = this.form.get('visitors')?.value || 0;
    const children = this.form.get('children')?.value || 0;
    return members + visitors + children;
  }

  // ── Sauvegarde ──

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Veuillez corriger les champs invalides.');
      return;
    }

    const s = this.service();
    if (!s) return;

    this.saving.set(true);
    this.error.set(null);
    this.success.set(false);

    const raw = this.form.value;
    const visitorNames = raw.visitorNames.filter((name: string) => name && name.trim().length > 0);
    const members = raw.members || 0;
    const visitors = raw.visitors || 0;
    const children = raw.children || 0;
    const total = members + visitors + children;

    const payload = {
      members,
      visitors,
      children,
      total, // ✅ Ajout de total
      visitorNames,
    };

    this.serviceService
      .recordAttendance(s.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.saving.set(false);
          if (response.success) {
            this.success.set(true);
            const updated = response.data || this.service();
            if (updated) {
              this.service.set(updated);
              this.populateForm(updated);
            }
            setTimeout(() => this.success.set(false), 3000);
          } else {
            this.error.set(response.message || 'Erreur lors de l\'enregistrement.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur sauvegarde:', err);
          this.saving.set(false);
          this.error.set('Une erreur est survenue.');
        },
      });
  }

  goBack(): void {
    const s = this.service();
    if (s) {
      this.router.navigate(['/dashboard/cultes', s.id]);
    } else {
      this.router.navigate(['/dashboard/cultes']);
    }
  }
}
