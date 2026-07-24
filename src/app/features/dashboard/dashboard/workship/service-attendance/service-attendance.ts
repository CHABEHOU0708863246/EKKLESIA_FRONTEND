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
  selectedPhotoFile: File | null = null;

  getStatusLabel = ServiceUtils.getStatusLabel;
  getStatusColor = ServiceUtils.getStatusColor;
  getFormattedDate = ServiceUtils.getFormattedDate;

  constructor() {
    this.form = this.fb.group({
      men: [0, [Validators.min(0)]],
      women: [0, [Validators.min(0)]],
      visitors: [0, [Validators.min(0)]],
      children: [0, [Validators.min(0)]],
      acceptedJesus: [0, [Validators.min(0)]],
      notAcceptedJesus: [0, [Validators.min(0)]],
      observation: [''],
      photoUrl: ['', Validators.required], // ✅ Rendre obligatoire
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
    const attendance = service.attendance || {
      men: 0,
      women: 0,
      visitors: 0,
      children: 0,
      acceptedJesus: 0,
      notAcceptedJesus: 0,
      observation: '',
      photoUrl: '',
      visitorNames: [],
    };
    this.form.patchValue({
      men: attendance.men || 0,
      women: attendance.women || 0,
      visitors: attendance.visitors || 0,
      children: attendance.children || 0,
      acceptedJesus: attendance.acceptedJesus || 0,
      notAcceptedJesus: attendance.notAcceptedJesus || 0,
      observation: attendance.observation || '',
      photoUrl: attendance.photoUrl || '',
    });

    // Noms des visiteurs
    const visitorNamesArray = this.form.get('visitorNames') as FormArray;
    visitorNamesArray.clear();
    (attendance.visitorNames || []).forEach((name: string) => {
      visitorNamesArray.push(this.fb.control(name, Validators.required));
    });
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

  // ── Calcul des totaux ──

  get totalWithChildren(): number {
    const men = this.form.get('men')?.value || 0;
    const women = this.form.get('women')?.value || 0;
    const visitors = this.form.get('visitors')?.value || 0;
    const children = this.form.get('children')?.value || 0;
    return men + women + visitors + children;
  }

  get totalWithoutChildren(): number {
    const men = this.form.get('men')?.value || 0;
    const women = this.form.get('women')?.value || 0;
    const visitors = this.form.get('visitors')?.value || 0;
    return men + women + visitors;
  }

  // ── Gestion de la photo ──

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedPhotoFile = input.files[0];
      // Marquer le champ photoUrl comme touché pour la validation
      this.form.get('photoUrl')?.markAsTouched();
      // On garde le fichier pour l’upload après sauvegarde
      // On peut aussi afficher un message dans le formulaire
      this.form.patchValue({ photoUrl: this.selectedPhotoFile.name });
    }
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
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

    // Si une photo a été sélectionnée, on l’upload d’abord, puis on enregistre les présences
    if (this.selectedPhotoFile) {
      this.uploadPhotoAndSave(s);
    } else {
      // Sinon, on utilise l’éventuelle photoUrl existante (si déjà uploadée)
      this.saveAttendance(s);
    }
  }

  private uploadPhotoAndSave(service: any): void {
  this.saving.set(true);
  this.error.set(null);
  this.success.set(false);

  this.serviceService.uploadPhoto(service.id, this.selectedPhotoFile!)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        if (response.success && response.photoId) {
          // ✅ Mettre à jour le champ photoUrl avec l'ID réel
          this.form.patchValue({ photoUrl: response.photoId });
          this.selectedPhotoFile = null;
          this.saveAttendance(service);
        } else {
          this.saving.set(false);
          this.error.set(response.message || 'Erreur lors de l’upload de la photo.');
        }
      },
      error: (err) => {
        console.error('❌ Erreur upload photo:', err);
        this.saving.set(false);
        this.error.set('Erreur lors de l’upload de la photo.');
      },
    });
}

  private saveAttendance(service: any): void {
    const raw = this.form.value;
  const isValidPhotoId = /^[0-9a-fA-F]{24}$/.test(raw.photoUrl || '');

  if (!isValidPhotoId) {
    this.saving.set(false);
    this.error.set('La photo n\'a pas été correctement téléchargée. Veuillez réessayer.');
    return;
  }

    // Filtrage des noms de visiteurs non vides
    const visitorNames = (raw.visitorNames || [])
      .filter((name: string) => name && name.trim().length > 0);

    const payload = {
      men: raw.men || 0,
      women: raw.women || 0,
      visitors: raw.visitors || 0,
      children: raw.children || 0,
      acceptedJesus: raw.acceptedJesus || 0,
      notAcceptedJesus: raw.notAcceptedJesus || 0,
      observation: raw.observation || '',
      photoUrl: raw.photoUrl || '',
      visitorNames,
    };

    this.serviceService
      .recordAttendance(service.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.saving.set(false);
          if (response.isSuccess !== false) {
            this.success.set(true);
            // Recharger le service pour mettre à jour les données
            this.loadService(service.id);
            setTimeout(() => this.success.set(false), 3000);
          } else {
            this.error.set(response.errorMessage || 'Erreur lors de l\'enregistrement.');
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
