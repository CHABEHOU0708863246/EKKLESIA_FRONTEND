import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { distinctUntilChanged, finalize, Subject, takeUntil } from 'rxjs';
import { PublicEventDetails, ParticipantProfileType } from '../../models/Events/event.model';
import { PublicRegistrationService } from '../../services/Event/public-registration-service';
import { Church as ChurchService } from '../../services/Church/church';
import { Church as ChurchModel } from '../../models/Church/church.model';
import { Site } from '../../models/Church/site.model';

const PROFILE_OPTIONS = [
  { value: ParticipantProfileType.External, label: 'Personne extérieure' },
  { value: ParticipantProfileType.Member, label: 'Membre simple' },
  { value: ParticipantProfileType.Berehin, label: 'Béréen' },
  { value: ParticipantProfileType.FraternityLeader, label: 'Leader de fraternité' },
  { value: ParticipantProfileType.Shepherd, label: 'Berger' },
  { value: ParticipantProfileType.ShepherdMinister, label: 'Ministre Berger' },
  { value: ParticipantProfileType.Pastor, label: 'Pasteur' },
];

@Component({
  selector: 'app-public-event-registration',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule], // ✅ FormsModule retiré — inutile et risque de conflit avec formControlName
  templateUrl: './public-event-registration.html',
  styleUrl: './public-event-registration.scss',
})
export class PublicEventRegistration implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private registrationService = inject(PublicRegistrationService);
  private churchService = inject(ChurchService);

  eventId!: string;
  event = signal<PublicEventDetails | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  submitting = signal(false);

  churches = signal<ChurchModel[]>([]);
  sites = signal<Site[]>([]);
  loadingChurches = signal(false);
  loadingSites = signal(false);

  registrationResult = signal<{
    checkoutUrl?: string;
    paymentUrl?: string;
    qrCode?: string;
    registrationId: string;
  } | null>(null);

  readonly profileOptions = PROFILE_OPTIONS;

  form: FormGroup;

  availableFormulas = computed(() => {
    const ev = this.event();
    return ev?.formulas.filter(f => f.isAvailable) ?? [];
  });

  constructor() {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      gender: ['', Validators.required],
      profileType: [ParticipantProfileType.External, Validators.required],
      churchId: [''],
      siteId: [{ value: '', disabled: true }],
      formulaId: ['', Validators.required],
      paymentMethod: ['wave'],
    });

    // 🔍 DEBUG — confirme que l'abonnement est bien créé au démarrage
    console.debug('[PublicEventRegistration] Abonnement churchId.valueChanges initialisé');

    this.form.get('churchId')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((churchId: string) => {
        // 🔍 DEBUG — si cette ligne n'apparaît jamais dans la console au clic,
        // le <select> du template n'est pas relié à ce FormControl.
        console.debug('[PublicEventRegistration] churchId changé →', churchId);

        const siteControl = this.form.get('siteId');
        siteControl?.setValue('');
        this.sites.set([]);

        if (!churchId) {
          siteControl?.disable();
          return;
        }

        siteControl?.enable();
        this.loadSitesForChurch(churchId);
      });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('eventId');
    if (!id) {
      this.error.set("Lien d'inscription invalide.");
      this.loading.set(false);
      return;
    }
    this.eventId = id;
    this.loadEvent();
    this.loadChurches();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadChurches(): void {
    this.loadingChurches.set(true);
    console.debug('[PublicEventRegistration] Chargement des églises…');

    this.churchService.getAllChurches().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        console.debug('[PublicEventRegistration] Réponse getAllChurches:', response);
        if (response.success && response.data) {
          this.churches.set(response.data);
          console.debug(`[PublicEventRegistration] ${response.data.length} églises chargées`);
        } else {
          console.warn('[PublicEventRegistration] getAllChurches — réponse sans succès ou sans data', response);
        }
        this.loadingChurches.set(false);
      },
      error: (err) => {
        console.error('❌ [PublicEventRegistration] Erreur chargement des églises:', err);
        this.loadingChurches.set(false);
      },
    });
  }

  private loadSitesForChurch(churchId: string): void {
    this.loadingSites.set(true);
    console.debug('[PublicEventRegistration] Chargement des sites pour église', churchId);

    this.churchService.getSitesByChurchId(churchId).pipe(
      finalize(() => this.loadingSites.set(false)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        console.debug('[PublicEventRegistration] Réponse getSitesByChurchId:', response);
        if (response.success && response.data) {
          this.sites.set(response.data);
          console.debug(`[PublicEventRegistration] ${response.data.length} sites chargés`);
        } else {
          console.warn('[PublicEventRegistration] Aucun site retourné pour l\'église', churchId, response);
          this.sites.set([]);
        }
      },
      error: (err) => {
        console.error('❌ [PublicEventRegistration] Erreur chargement des sites:', err);
        this.sites.set([]);
      },
    });
  }

  private loadEvent(): void {
    this.loading.set(true);
    this.error.set(null);

    this.registrationService.getEventDetails(this.eventId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ev) => {
          this.event.set(ev);
          this.loading.set(false);

          if (!ev.registrationOpen) {
            this.error.set('Les inscriptions pour cet événement sont fermées.');
          } else if (ev.isFull) {
            this.error.set('Cet événement est complet.');
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(
            err?.status === 404
              ? "Cet événement n'existe pas ou l'inscription publique n'est plus disponible."
              : "Une erreur est survenue lors du chargement de l'événement."
          );
        },
      });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getFormulaLabel(formulaId: string): string {
    const f = this.event()?.formulas.find((x) => x.id === formulaId);
    return f ? `${f.name} — ${f.price.toLocaleString()} ${f.currency}` : '';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const raw = this.form.value;
    this.registrationService.register({
      eventId: this.eventId,
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      email: raw.email.trim(),
      phone: raw.phone.trim(),
      gender: raw.gender,
      profileType: raw.profileType,
      churchId: raw.churchId || undefined,
      siteId: raw.siteId || undefined,
      formulaId: raw.formulaId,
      paymentMethod: raw.paymentMethod,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.registrationResult.set({
          checkoutUrl: response.checkoutUrl,
          paymentUrl: response.paymentUrl,
          qrCode: response.qrCode,
          registrationId: response.registrationId,
        });

        if (!response.success) {
          this.error.set(response.message);
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(
          err?.error?.message || "Une erreur est survenue lors de l'inscription. Veuillez réessayer."
        );
      },
    });
  }

  goToPayment(): void {
    const result = this.registrationResult();
    const url = result?.checkoutUrl || result?.paymentUrl;
    if (url) {
      window.location.href = url;
    }
  }
}
