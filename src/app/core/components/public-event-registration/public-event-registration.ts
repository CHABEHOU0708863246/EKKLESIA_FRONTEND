import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, Validators,
  AbstractControl, ValidationErrors
} from '@angular/forms';
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

/**
 * Validateur de groupe : une adresse email doit exister quelque part
 * (participant OU payeur), sinon aucun reçu ne peut être envoyé.
 */
function atLeastOneEmailValidator(group: AbstractControl): ValidationErrors | null {
  const email = (group.get('email')?.value ?? '').trim();
  const payerEmail = (group.get('payerEmail')?.value ?? '').trim();
  return email || payerEmail ? null : { noEmailAnywhere: true };
}

@Component({
  selector: 'app-public-event-registration',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './public-event-registration.html',
  styleUrl: './public-event-registration.scss',
})
export class PublicEventRegistration implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private registrationService = inject(PublicRegistrationService);
  private churchService = inject(ChurchService);

  // ── Mode maintenance ──
  maintenanceMode = signal(true); // à basculer à false pour réactiver
  timeUntilTen = signal<string>('');

  // ── Synthèse vocale ──
  private synth = window.speechSynthesis;
  private targetTime!: Date;

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
    participantName: string;
  } | null>(null);

  private lastPayer: {
    paidByThirdParty: boolean;
    payerName: string;
    payerPhone: string;
    payerEmail: string;
  } | null = null;

  registeredCount = signal(0);

  readonly profileOptions = PROFILE_OPTIONS;

  form: FormGroup;

  availableFormulas = computed(() => {
    const ev = this.event();
    return ev?.formulas.filter(f => f.isAvailable) ?? [];
  });

  get isThirdPartyPayer(): boolean {
    return this.form.get('paidByThirdParty')?.value === true;
  }

  get missingEmailEverywhere(): boolean {
    return this.form.hasError('noEmailAnywhere')
        && (this.form.get('email')?.touched === true
         || this.form.get('payerEmail')?.touched === true
         || this.form.touched);
  }

  constructor() {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.email]],
      phone: ['', Validators.required],
      gender: ['', Validators.required],
      profileType: [ParticipantProfileType.External, Validators.required],
      churchId: [''],
      siteId: [{ value: '', disabled: true }],
      formulaId: ['', Validators.required],
      paymentMethod: ['wave'],
      paidByThirdParty: [false],
      payerName: [''],
      payerPhone: [''],
      payerEmail: ['', [Validators.email]],
    }, { validators: atLeastOneEmailValidator });

    // ── Église → sites ──
    this.form.get('churchId')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((churchId: string) => {
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

    // ── Bascule « quelqu'un d'autre paie » ──
    this.form.get('paidByThirdParty')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((isThirdParty: boolean) => this.applyPayerMode(isThirdParty));
  }

  ngOnInit(): void {
    if (this.maintenanceMode()) {
      this.startCountdownToTen();
    }

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
    this.synth?.cancel();
  }

  // ── Compte à rebours pour la maintenance ──
  private startCountdownToTen(): void {
    const now = new Date();
    this.targetTime = new Date(now);
    this.targetTime.setHours(10, 0, 0, 0);
    if (now >= this.targetTime) {
      this.targetTime.setDate(this.targetTime.getDate() + 1);
    }
    this.updateCountdown();
    setInterval(() => this.updateCountdown(), 1000);
  }

  private updateCountdown(): void {
    const diff = this.targetTime.getTime() - Date.now();
    if (diff <= 0) {
      this.timeUntilTen.set('00:00:00');
      return;
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    this.timeUntilTen.set(
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    );
  }

  // ── Alerte vocale ── (optionnel)
  speakAlert(): void {
    if (!this.synth) {
      alert('La synthèse vocale n’est pas supportée par votre navigateur.');
      return;
    }
    this.synth.cancel();
    const message =
      'Attention. Les inscriptions en ligne sont suspendues pour des raisons de sécurité. ' +
      'Le service sera rétabli à 10h00. Merci de votre patience.';
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    this.synth.speak(utterance);
  }

  // ══════════════════════════════════════════════════════════
  // PAYEUR
  // ══════════════════════════════════════════════════════════

  private applyPayerMode(isThirdParty: boolean): void {
    const nameCtrl = this.form.get('payerName');
    const phoneCtrl = this.form.get('payerPhone');

    if (isThirdParty) {
      nameCtrl?.setValidators([Validators.required, Validators.minLength(2)]);
      phoneCtrl?.setValidators([Validators.required]);
    } else {
      nameCtrl?.clearValidators();
      phoneCtrl?.clearValidators();
      nameCtrl?.setValue('', { emitEvent: false });
      phoneCtrl?.setValue('', { emitEvent: false });
    }

    nameCtrl?.updateValueAndValidity({ emitEvent: false });
    phoneCtrl?.updateValueAndValidity({ emitEvent: false });
    this.form.updateValueAndValidity({ emitEvent: false });
  }

  // ══════════════════════════════════════════════════════════
  // CHARGEMENT
  // ══════════════════════════════════════════════════════════

  private loadChurches(): void {
    this.loadingChurches.set(true);
    this.churchService.getAllChurches()
      .pipe(finalize(() => this.loadingChurches.set(false)), takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.churches.set(response.data);
          }
        },
        error: (err) => console.error('❌ Chargement des églises', err?.status, err?.error),
      });
  }

  private loadSitesForChurch(churchId: string): void {
    this.loadingSites.set(true);
    this.churchService.getSitesByChurchId(churchId)
      .pipe(finalize(() => this.loadingSites.set(false)), takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.sites.set(response.success && response.data ? response.data : []);
        },
        error: (err) => {
          console.error('❌ Chargement des sites', err?.status, err?.error);
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

  // ══════════════════════════════════════════════════════════
  // VALIDATION & SOUMISSION
  // ══════════════════════════════════════════════════════════

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

      if (this.form.hasError('noEmailAnywhere')) {
        this.error.set(
          "Une adresse email est nécessaire pour recevoir le reçu : "
        + "celle du participant, ou celle de la personne qui paie."
        );
      }
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();
    const isThirdParty = raw.paidByThirdParty === true;

    this.lastPayer = {
      paidByThirdParty: isThirdParty,
      payerName: (raw.payerName ?? '').trim(),
      payerPhone: (raw.payerPhone ?? '').trim(),
      payerEmail: (raw.payerEmail ?? '').trim(),
    };

    const participantName = `${raw.firstName.trim()} ${raw.lastName.trim()}`;

    this.registrationService.register({
      eventId: this.eventId,
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      email: (raw.email ?? '').trim() || undefined,
      phone: raw.phone.trim(),
      gender: raw.gender,
      profileType: raw.profileType,
      churchId: raw.churchId || undefined,
      siteId: raw.siteId || undefined,
      formulaId: raw.formulaId,
      paymentMethod: raw.paymentMethod,
      paidByThirdParty: isThirdParty,
      payerName: isThirdParty ? (raw.payerName ?? '').trim() : undefined,
      payerPhone: isThirdParty ? (raw.payerPhone ?? '').trim() : undefined,
      payerEmail: (raw.payerEmail ?? '').trim() || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.submitting.set(false);

        if (!response.success) {
          this.error.set(response.message);
          return;
        }

        this.registeredCount.update((n) => n + 1);
        this.registrationResult.set({
          checkoutUrl: response.checkoutUrl,
          paymentUrl: response.paymentUrl,
          qrCode: response.qrCode,
          registrationId: response.registrationId,
          participantName,
        });
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(
          err?.error?.message
          || "Une erreur est survenue lors de l'inscription. Veuillez réessayer."
        );
      },
    });
  }

  goToPayment(): void {
    const result = this.registrationResult();
    const url = result?.checkoutUrl || result?.paymentUrl;
    if (url) window.location.href = url;
  }

  registerAnotherPerson(): void {
    const previous = this.form.getRawValue();

    this.registrationResult.set(null);
    this.error.set(null);

    this.form.reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      gender: '',
      profileType: ParticipantProfileType.External,
      churchId: previous.churchId ?? '',
      siteId: previous.siteId ?? '',
      formulaId: previous.formulaId ?? '',
      paymentMethod: previous.paymentMethod ?? 'wave',
      paidByThirdParty: this.lastPayer?.paidByThirdParty ?? false,
      payerName: this.lastPayer?.payerName ?? '',
      payerPhone: this.lastPayer?.payerPhone ?? '',
      payerEmail: this.lastPayer?.payerEmail ?? '',
    }, { emitEvent: false });

    this.applyPayerMode(this.lastPayer?.paidByThirdParty ?? false);

    if (previous.churchId) {
      this.form.get('siteId')?.enable({ emitEvent: false });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
