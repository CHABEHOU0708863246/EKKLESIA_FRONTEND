// src/app/features/dashboard/services/service-attendance/service-attendance.component.ts

import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ServiceUtils } from '../../../../../core/models/Events/service.model';
import { Service } from '../../../../../core/services/Worship/service';
import { MultiPhotoUpload } from '../../../../../core/components/multi-photo-upload/multi-photo-upload';

@Component({
  selector: 'app-service-attendance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MultiPhotoUpload],
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
  /** Photos sélectionnées (1 à 5) — RG-PHOTO. */
  selectedPhotos: File[] = [];
  /** Photos déjà enregistrées. */
  existingPhotoIds: string[] = [];

  getStatusLabel = ServiceUtils.getStatusLabel;
  getStatusColor = ServiceUtils.getStatusColor;
  getFormattedDate = ServiceUtils.getFormattedDate;

  constructor() {
    this.form = this.fb.group({
      men: [0, [Validators.min(0)]],
      women: [0, [Validators.min(0)]],
      children: [0, [Validators.min(0)]],
      visitors: [0, [Validators.min(0)]],
      acceptedJesus: [0, [Validators.min(0)]],
      notAcceptedJesus: [0, [Validators.min(0)]],
      observation: [''],
      photoUrl: [''], // 1ʳᵉ photo (compatibilité) — la présence de photos est validée à l'enregistrement
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

  /** Total des présents (Hommes + Femmes + Enfants). */
  totalPresent(): number {
    const v = this.form.value;
    return (v.men || 0) + (v.women || 0) + (v.children || 0);
  }

  /** Enfants. */
  minors(): number {
    return this.form.value.children || 0;
  }

  /** Total hors enfants : Hommes + Femmes + Nouveaux (visiteurs). */
  totalHorsEnfants(): number {
    const v = this.form.value;
    return (v.men || 0) + (v.women || 0) + (v.visitors || 0);
  }

  /** Total avec enfants : hors enfants + enfants. */
  totalAvecEnfants(): number {
    return this.totalHorsEnfants() + (this.form.value.children || 0);
  }

  private populateForm(service: any): void {
    const attendance = service.attendance || {};
    this.form.patchValue({
      men: attendance.men || 0,
      women: attendance.women || 0,
      children: attendance.children || 0,
      visitors: attendance.visitors || 0,
      acceptedJesus: attendance.acceptedJesus || 0,
      notAcceptedJesus: attendance.notAcceptedJesus || 0,
      observation: attendance.observation || '',
      photoUrl: attendance.photoUrl || '',
    });

    // Photos déjà enregistrées (RG-PHOTO).
    this.existingPhotoIds = Array.isArray(attendance.photoUrls) && attendance.photoUrls.length
      ? attendance.photoUrls
      : (attendance.photoUrl ? [attendance.photoUrl] : []);

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

  /** Callback du composant multi-photos (1 à 5). */
  onPhotosChange(files: File[]): void {
    this.selectedPhotos = files;
  }

  /** URL d'aperçu d'une photo déjà enregistrée. */
  readonly resolvePhotoUrl = (id: string): string => this.serviceService.getPhotoUrl(id);

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

    // RG-PHOTO : au moins une photo (1 à 5).
    if ((this.selectedPhotos.length + this.existingPhotoIds.length) < 1) {
      this.error.set('Au moins une photo justificative est obligatoire (1 à 5 photos).');
      return;
    }

    // Si des photos ont été sélectionnées, on les upload d’abord, puis on enregistre les présences.
    if (this.selectedPhotos.length) {
      this.uploadPhotosAndSave(s);
    } else {
      // Sinon, on utilise les photos déjà enregistrées.
      this.saveAttendance(s);
    }
  }

  private uploadPhotosAndSave(service: any): void {
    this.saving.set(true);
    this.error.set(null);
    this.success.set(false);

    this.serviceService.uploadPhotos(service.id, this.selectedPhotos)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Mémorise la liste complète (existantes + nouvelles) renvoyée par l'API.
            this.existingPhotoIds = response.photoIds
              ?? (response.data as any)?.attendance?.photoUrls
              ?? this.existingPhotoIds;
            this.selectedPhotos = [];
            this.saveAttendance(service);
          } else {
            this.saving.set(false);
            this.error.set(response.message || 'Erreur lors de l’upload des photos.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur upload photos:', err);
          this.saving.set(false);
          this.error.set('Erreur lors de l’upload des photos.');
        },
      });
  }

  private saveAttendance(service: any): void {
    const raw = this.form.value;

    // Photos (1 à 5) : liste + 1ʳᵉ photo (compatibilité).
    const photoUrls = this.existingPhotoIds.filter((id) => /^[0-9a-fA-F]{24}$/.test(id));
    if (!photoUrls.length) {
      this.saving.set(false);
      this.error.set('Au moins une photo justificative est obligatoire (1 à 5 photos).');
      return;
    }

    // Filtrage des noms de visiteurs non vides
    const visitorNames = (raw.visitorNames || [])
      .filter((name: string) => name && name.trim().length > 0);

    const payload = {
      men: raw.men || 0,
      women: raw.women || 0,
      children: raw.children || 0,
      visitors: raw.visitors || 0,
      acceptedJesus: raw.acceptedJesus || 0,
      notAcceptedJesus: raw.notAcceptedJesus || 0,
      observation: raw.observation || '',
      photoUrl: photoUrls[0],
      photoUrls,
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
