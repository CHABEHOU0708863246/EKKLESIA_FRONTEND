// src/app/features/dashboard/dashboard/events/event-form/event-form.ts
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';


import { User } from '../../../../../core/models/Users/user.model';
import { Users } from '../../../../../core/services/Users/users';
import { Church as ChurchModel } from '../../../../../core/models/Church/church.model';
import { Church as ChurchService } from '../../../../../core/services/Church/church';
import { Site } from '../../../../../core/models/Church/site.model';
import { EventTypeLabels, EventStatus, EventCreate, EventUpdate } from '../../../../../core/models/Events/event.model';
import { Events } from '../../../../../core/services/Event/events';
import { EventType } from '../../../../../core/models/Events/event.model';

const TYPE_OPTIONS = (Object.keys(EventType) as Array<keyof typeof EventType>).map((key) => ({
  value: EventType[key],
  label: EventTypeLabels[EventType[key]],
}));

const STATUS_OPTIONS = [
  { value: EventStatus.Scheduled, label: 'Planifié' },
  { value: EventStatus.Ongoing, label: 'En cours' },
  { value: EventStatus.Completed, label: 'Terminé' },
  { value: EventStatus.Cancelled, label: 'Annulé' },
  { value: EventStatus.Postponed, label: 'Reporté' },
];

const CURRENCY_OPTIONS = ['FCFA', 'EUR', 'USD', 'GBP', 'CAD'];

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './event-form.html',
  styleUrl: './event-form.scss',
})
export class EventForm implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private eventId: string | null = null;

  readonly typeOptions = TYPE_OPTIONS;
  readonly statusOptions = STATUS_OPTIONS;
  readonly currencyOptions = CURRENCY_OPTIONS;

  isEditMode = signal(false);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);

  // ── Église / Site ──
  churches = signal<ChurchModel[]>([]);
  loadingChurches = signal(false);
  sites = signal<Site[]>([]);
  loadingSites = signal(false);

  // ── Organisateur (recherche) ──
  searchingOrganizer = signal(false);
  showOrganizerResults = signal(false);
  organizerResults = signal<User[]>([]);
  selectedOrganizer = signal<User | null>(null);

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private eventService: Events,
    private userService: Users,
    private churchService: ChurchService,
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      type: [EventType.Other, Validators.required],
      status: [EventStatus.Scheduled],

      startDate: ['', Validators.required],
      endDate: [''],

      location: [''],
      address: this.fb.group({
        street: [''],
        city: [''],
        state: [''],
        country: ["Côte d'Ivoire"],
        postalCode: [''],
      }),

      churchId: ['', Validators.required],
      siteId: [''],

      organizerId: ['', Validators.required],
      organizerSearch: [''],

      capacity: [null],
      registrationRequired: [false],
      registrationOpen: [true],
      registrationDeadline: [''],

      price: [0],
      currency: ['FCFA'],

      isRecurring: [false],
      recurrencePattern: [''],
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.eventId = this.route.snapshot.paramMap.get('id');
    this.isEditMode.set(!!this.eventId);

    this.loadChurches();

    if (this.isEditMode()) {
      this.loadEvent();
    }

    this.form.get('churchId')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((churchId: string) => this.loadSites(churchId));

    this.form.get('organizerSearch')?.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term: string) => {
        if (term && term.trim().length >= 2) {
          this.performOrganizerSearch(term.trim());
        } else {
          this.organizerResults.set([]);
          this.showOrganizerResults.set(false);
        }
      });

    // Le prix à 0 n'a de sens que si l'inscription est requise, sinon on masque le champ
    this.form.get('registrationRequired')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((required: boolean) => {
        if (!required) {
          this.form.patchValue({ price: 0, capacity: null, registrationDeadline: '' }, { emitEvent: false });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT (mode édition)
  // ───────────────────────────────────────────────────────────────

  private loadEvent(): void {
  if (!this.eventId) return;
  this.loading.set(true);

  this.eventService
    .getById(this.eventId)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (event) => { // On renomme 'response' en 'event' pour plus de clarté
        if (event) {
          this.populateForm(event); // ✅ On passe directement l'événement au formulaire
        } else {
          this.error.set('Impossible de charger cet événement.');
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger cet événement.');
        this.loading.set(false);
      },
    });
}

  private populateForm(event: any): void {
    this.form.patchValue({
      title: event.title,
      description: event.description ?? '',
      type: event.type,
      status: event.status,
      startDate: this.toDateTimeInputValue(event.startDate),
      endDate: this.toDateTimeInputValue(event.endDate),
      location: event.location ?? '',
      address: {
        street: event.address?.street ?? '',
        city: event.address?.city ?? '',
        state: event.address?.state ?? '',
        country: event.address?.country ?? '',
        postalCode: event.address?.postalCode ?? '',
      },
      churchId: event.churchId,
      siteId: event.siteId ?? '',
      organizerId: event.organizerId,
      organizerSearch: event.organizerName,
      capacity: event.capacity ?? null,
      registrationRequired: event.registrationRequired,
      registrationOpen: event.registrationOpen,
      registrationDeadline: this.toDateTimeInputValue(event.registrationDeadline),
      price: event.price ?? 0,
      currency: event.currency ?? 'FCFA',
      isRecurring: event.isRecurring,
      recurrencePattern: event.recurrencePattern ?? '',
    }, { emitEvent: false });

    this.selectedOrganizer.set({
      id: event.organizerId,
      firstName: '',
      lastName: '',
      fullName: event.organizerName,
    } as User);

    this.loadSites(event.churchId);
  }

  private toDateTimeInputValue(date: string | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    // format datetime-local : YYYY-MM-DDTHH:mm
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ───────────────────────────────────────────────────────────────
  // ÉGLISE / SITE
  // ───────────────────────────────────────────────────────────────

  private loadChurches(): void {
    this.loadingChurches.set(true);
    this.churchService
      .getAllChurches()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) this.churches.set(response.data as any);
          this.loadingChurches.set(false);
        },
        error: () => this.loadingChurches.set(false),
      });
  }

  private loadSites(churchId: string): void {
    this.form.get('siteId')?.setValue('', { emitEvent: false });
    this.sites.set([]);
    if (!churchId) return;

    this.loadingSites.set(true);
    this.churchService
      .getSitesByChurchId(churchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) this.sites.set(response.data as any);
          this.loadingSites.set(false);
        },
        error: () => this.loadingSites.set(false),
      });
  }

  // ───────────────────────────────────────────────────────────────
  // RECHERCHE D'ORGANISATEUR
  // ───────────────────────────────────────────────────────────────

  private performOrganizerSearch(term: string): void {
    this.searchingOrganizer.set(true);
    this.showOrganizerResults.set(true);

    this.userService
      .getUsers({ fullName: term, page: 1, pageSize: 15 } as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.organizerResults.set((response.data.items ?? []) as User[]);
          } else {
            this.organizerResults.set([]);
          }
          this.searchingOrganizer.set(false);
        },
        error: () => {
          this.organizerResults.set([]);
          this.searchingOrganizer.set(false);
        },
      });
  }

  selectOrganizer(user: User): void {
    this.selectedOrganizer.set(user);
    this.form.patchValue({
      organizerId: (user as any).memberId ?? user.id,
      organizerSearch: user.fullName || `${user.firstName} ${user.lastName}`,
    });
    this.showOrganizerResults.set(false);
    this.organizerResults.set([]);
  }

  clearOrganizer(): void {
    this.selectedOrganizer.set(null);
    this.form.patchValue({ organizerId: '', organizerSearch: '' });
  }

  getInitialsFromUser(user: User): string {
    const f = user.firstName?.charAt(0) || '?';
    const l = user.lastName?.charAt(0) || '?';
    return `${f}${l}`.toUpperCase() || '?';
  }

  // ───────────────────────────────────────────────────────────────
  // VALIDATION / SOUMISSION
  // ───────────────────────────────────────────────────────────────

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Veuillez corriger les champs invalides avant de continuer.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    if (this.isEditMode()) {
      this.updateExistingEvent();
    } else {
      this.createNewEvent();
    }
  }

  private buildAddressPayload(value: any) {
    const a = value.address;
    const hasAny = a.street || a.city || a.state || a.postalCode;
    return hasAny
      ? {
          street: a.street || undefined,
          city: a.city || undefined,
          state: a.state || undefined,
          country: a.country || undefined,
          postalCode: a.postalCode || undefined,
        }
      : undefined;
  }

  private createNewEvent(): void {
    const value = this.form.value;
    const payload: EventCreate = {
      title: value.title,
      description: value.description || undefined,
      type: value.type,
      startDate: value.startDate,
      endDate: value.endDate || undefined,
      location: value.location || undefined,
      address: this.buildAddressPayload(value),
      organizerId: value.organizerId,
      churchId: value.churchId,
      siteId: value.siteId || undefined,
      capacity: value.capacity || undefined,
      registrationRequired: value.registrationRequired,
      registrationOpen: value.registrationOpen,
      registrationDeadline: value.registrationDeadline || undefined,
      price: value.price || 0,
      currency: value.currency || 'FCFA',
      status: value.status,
      isRecurring: value.isRecurring,
      recurrencePattern: value.recurrencePattern || undefined,
    };

    this.eventService
      .create(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          if (response.success && response.data) {
            this.router.navigate(['/dashboard/evenements', response.data.id]);
          } else {
            this.error.set(response.message || 'Inscription réussie.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur lors de la création de l’événement:', err);
          this.saving.set(false);
          this.error.set('Une erreur est survenue lors de la création.');
        },
      });
  }

  private updateExistingEvent(): void {
    if (!this.eventId) return;
    const value = this.form.value;
    const payload: EventUpdate = {
      title: value.title,
      description: value.description || undefined,
      type: value.type,
      startDate: value.startDate,
      endDate: value.endDate || undefined,
      location: value.location || undefined,
      address: this.buildAddressPayload(value),
      siteId: value.siteId || undefined,
      capacity: value.capacity || undefined,
      registrationRequired: value.registrationRequired,
      registrationOpen: value.registrationOpen,
      registrationDeadline: value.registrationDeadline || undefined,
      price: value.price || 0,
      currency: value.currency || 'FCFA',
      status: value.status,
      isRecurring: value.isRecurring,
      recurrencePattern: value.recurrencePattern || undefined,
    };

    this.eventService
      .update(this.eventId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          if (response.success) {
            this.router.navigate(['/dashboard/evenements', this.eventId]);
          } else {
            this.error.set(response.message || 'Une erreur est survenue lors de la mise à jour.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur lors de la mise à jour de l’événement:', err);
          this.saving.set(false);
          this.error.set('Une erreur est survenue lors de la mise à jour.');
        },
      });
  }

  cancel(): void {
    if (this.isEditMode() && this.eventId) {
      this.router.navigate(['/dashboard/evenements', this.eventId]);
    } else {
      this.router.navigate(['/dashboard/evenements']);
    }
  }

  getInitials(): string {
    const title = this.form.get('title')?.value ?? '';
    return title.trim().charAt(0).toUpperCase() || '?';
  }
}
