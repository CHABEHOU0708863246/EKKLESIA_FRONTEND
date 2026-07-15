import { Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLinkActive, RouterModule } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { Church as ChurchService } from '../../../../../core/services/Church/church';
import { Church as ChurchModel } from '../../../../../core/models/Church/church.model';
import { ServiceCreate, ServiceStatus, ServiceStatusLabels, ServiceTeam, TEAM_ROLE_LABELS, TEAM_ROLES, TeamMember } from '../../../../../core/models/Events/service.model';
import { Site } from '../../../../../core/models/Church/site.model';
import { Member } from '../../../../../core/models/Members/member.model';
import { User } from '../../../../../core/models/Users/user.model';
import { Members } from '../../../../../core/services/Members/members';
import { Roles } from '../../../../../core/services/Roles/roles';
import { Users } from '../../../../../core/services/Users/users';
import { Service } from '../../../../../core/services/Worship/service';


// Enum des statuts
const STATUS_OPTIONS = Object.values(ServiceStatus).map((value) => ({
  value,
  label: ServiceStatusLabels[value],
}));

// Rôles d'équipe disponibles pour les membres
const TEAM_ROLE_OPTIONS = [
  { value: 'Chantre', label: 'Chantre' },
  { value: 'Guitariste', label: 'Guitariste' },
  { value: 'Bassiste', label: 'Bassiste' },
  { value: 'Batteur', label: 'Batteur' },
  { value: 'Claviériste', label: 'Claviériste' },
  { value: 'Ingénieur son', label: 'Ingénieur son' },
  { value: 'Lumière', label: 'Lumière' },
  { value: 'Accueil', label: 'Accueil' },
  { value: 'Huissier', label: 'Huissier' },
  { value: 'Enseignant', label: 'Enseignant' },
  { value: 'Vidéaste', label: 'Vidéaste' },
  { value: 'Photographe', label: 'Photographe' },
  { value: 'Autre', label: 'Autre' },
];

@Component({
  selector: 'app-service-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './service-form.html',
  styleUrls: ['./service-form.scss'],
})
export class ServiceForm implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ── Liste des statuts ──
  readonly statusOptions = STATUS_OPTIONS;
  readonly ServiceStatus = ServiceStatus;
  readonly TEAM_ROLES = TEAM_ROLES;
  readonly TEAM_ROLE_LABELS = TEAM_ROLE_LABELS;
  readonly TEAM_ROLE_OPTIONS = TEAM_ROLE_OPTIONS;

  preacherRoleNames = signal<string[]>([]);



  // ── État du formulaire ──
  saving = signal(false);
  error = signal<string | null>(null);
  isEditMode = signal(false);
  serviceId: string | null = null;

  // ── Listes déroulantes ──
  churches = signal<ChurchModel[]>([]);
  loadingChurches = signal(false);
  sites = signal<Site[]>([]);
  loadingSites = signal(false);

  // ── Prédicateurs (pasteurs) ──
  preachers = signal<User[]>([]);
  loadingPreachers = signal(false);
  preacherSearchTerm = signal('');

  // ── Chefs de louange (membres) ──
  worshipLeaders = signal<Member[]>([]);
  loadingWorshipLeaders = signal(false);
  worshipLeaderSearchTerm = signal('');

  // ── Membres pour les équipes (recherche par autocomplete) ──
  searchingTeamMember = signal<{ team: string; index: number } | null>(null);
  teamMemberResults = signal<Member[]>([]);
  teamMemberSearchTerm = signal('');

  // ── Formulaire principal ──
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private serviceService: Service,
    private churchService: ChurchService,
    private memberService: Members,
    private userService: Users,
    private roleService: Roles,
    private router: Router
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      date: ['', Validators.required],
      churchId: ['', Validators.required],
      siteId: [''],
      preacherId: [''],
      preacherSearch: [''],
      bibleText: [''],
      theme: [''],
      songIds: [[]],
      worshipLeaderId: [''],
      worshipLeaderSearch: [''],
      status: [ServiceStatus.Scheduled, Validators.required],
      notes: [''],
      // Équipes – chacune un FormArray
      team: this.fb.group({
        worship: this.fb.array([]),
        sound: this.fb.array([]),
        lighting: this.fb.array([]),
        welcome: this.fb.array([]),
        ushers: this.fb.array([]),
        children: this.fb.array([]),
        media: this.fb.array([]),
        other: this.fb.array([]),
      }),
      // Présences – on initialise à zéro
      attendance: this.fb.group({
        members: [0, Validators.min(0)],
        visitors: [0, Validators.min(0)],
        children: [0, Validators.min(0)],
        visitorNames: [[]],
      }),
    });
  }

  ngOnInit(): void {
    // Dans ngOnInit, chargez ces noms
    this.loadPreacherRoleNames();
    // Détecter si on est en mode édition (via l'URL)
    const urlSegments = this.router.url.split('/');
    if (urlSegments.includes('edit')) {
      this.isEditMode.set(true);
      // Extraire l'ID de l'URL : /dashboard/cultes/:id/edit
      const idIndex = urlSegments.indexOf('edit') - 1;
      this.serviceId = urlSegments[idIndex] || null;
      if (this.serviceId) {
        this.loadServiceData(this.serviceId);
      }
    }

    this.form.get('worshipLeaderSearch')?.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term: string) => {
        this.worshipLeaderSearchTerm.set(term || '');
        if (term && term.trim().length >= 2) {
          this.searchWorshipLeaders(term.trim());
        } else {
          this.worshipLeaders.set([]);
        }
      });

    // Charger les églises
    this.loadChurches();

    // Charger les prédicateurs (rôle PASTEUR_SITE ou PASTOR_PRINCIPAL)
    this.loadPreachers();

    // Charger les chefs de louange (membres avec un rôle spécifique ou tous)
    this.loadWorshipLeaders();

    // ── Réactivité pour le changement d'église → recharger les sites ──
    this.form.get('churchId')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((churchId: string) => {
        this.form.get('siteId')?.setValue('');
        this.sites.set([]);
        if (churchId) this.loadSites(churchId);
      });

    // ── Recherche de prédicateur ──
    this.form.get('preacherSearch')?.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term: string) => {
        if (term && term.trim().length >= 2) {
          this.searchPreachers(term.trim());
        } else {
          this.preachers.set([]);
        }
      });

    // ── Recherche de chef de louange ──
    this.form.get('worshipLeaderSearch')?.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term: string) => {
        if (term && term.trim().length >= 2) {
          this.searchWorshipLeaders(term.trim());
        } else {
          this.worshipLeaders.set([]);
        }
      });
  }

  private loadPreacherRoleNames(): void {
    const codes = ['PASTOR_PRINCIPAL', 'PASTEUR_SITE'];
    const names: string[] = [];
    let remaining = codes.length;

    for (const code of codes) {
      this.roleService.getRoleByCode(code).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            names.push(response.data.roleName);
          }
          remaining--;
          if (remaining === 0) this.preacherRoleNames.set(names);
        },
        error: () => {
          remaining--;
          if (remaining === 0) this.preacherRoleNames.set(names);
        },
      });
    }
  }



  /**
 * Retourne la liste des clés des équipes (worship, sound, lighting, etc.)
 * Utilisé dans le template pour itérer sur toutes les équipes.
 */
  getTeamKeys(): string[] {
    return Object.keys(TEAM_ROLES); // ['worship', 'sound', 'lighting', ...]
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT DES DONNÉES (édition)
  // ──────────────────────────────────────────────────────────────

  private loadServiceData(id: string): void {
    this.serviceService.getById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const service = response.data;
          this.populateForm(service);
        } else {
          this.error.set('Impossible de charger le culte.');
        }
      },
      error: () => this.error.set('Erreur lors du chargement du culte.'),
    });
  }

  private populateForm(service: any): void {
    this.form.patchValue({
      title: service.title,
      date: this.formatDateInput(service.date),
      churchId: service.churchId,
      siteId: service.siteId || '',
      preacherId: service.preacherId || '',
      preacherSearch: service.preacherName || '',
      bibleText: service.bibleText || '',
      theme: service.theme || '',
      songIds: service.songIds || [],
      worshipLeaderId: service.worshipLeaderId || '',
      worshipLeaderSearch: service.worshipLeaderName || '',
      status: service.status || ServiceStatus.Scheduled,
      notes: service.notes || '',
      attendance: {
        members: service.attendance?.members || 0,
        visitors: service.attendance?.visitors || 0,
        children: service.attendance?.children || 0,
        visitorNames: service.attendance?.visitorNames || [],
      },
    });

    // Charger les équipes
    if (service.team) {
      const teamKeys = Object.keys(TEAM_ROLES);
      teamKeys.forEach((key) => {
        const members = service.team[key] || [];
        const formArray = this.getTeamFormArray(key);
        formArray.clear(); // Vider le FormArray avant d'ajouter
        members.forEach((member: TeamMember) => {
          formArray.push(this.createTeamMemberGroup(member));
        });
      });
    }

    // Charger les sites pour l'église sélectionnée
    if (service.churchId) {
      this.loadSites(service.churchId);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT DES LISTES (Églises, Sites, Prédicateurs, etc.)
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

  private loadPreachers(): void {
    // Récupérer les utilisateurs ayant les rôles PASTEUR_SITE ou PASTOR_PRINCIPAL
    // On utilise le service Users avec un filtre sur les rôles
    this.userService
      .getUsers({
        page: 1,
        pageSize: 100,
        roles: ['PASTEUR_SITE', 'PASTOR_PRINCIPAL'],
      } as any)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.preachers.set(response.data.items as any);
          }
        },
        error: () => this.preachers.set([]),
      });
  }

  private searchPreachers(term: string): void {
    this.userService.getUsers({ fullName: term, page: 1, pageSize: 20 } as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const allowedNames = this.preacherRoleNames();
            console.log('🔍 Noms autorisés :', allowedNames);
            const items = (response.data.items ?? []) as User[];
            const filtered = allowedNames.length > 0
              ? items.filter((u) => (u.roles ?? []).some((r) => allowedNames.includes(r)))
              : items;
            console.log('👥 Prédicateurs filtrés :', filtered);
            this.preachers.set(filtered);
          } else {
            this.preachers.set([]);
          }
        },
        error: (err) => {
          console.error('❌ Erreur searchPreachers', err);
          this.preachers.set([]);
        },
      });
  }

  private loadWorshipLeaders(): void {
  this.memberService
    .getMembers({ page: 1, pageSize: 100 } as any)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: any) => {
        // ✅ La réponse est directement un objet avec `items`
        const items = response?.items ?? [];
        console.log('👥 Membres chargés :', items);
        this.worshipLeaders.set(items);
      },
      error: (err) => {
        console.error('❌ Erreur loadWorshipLeaders', err);
        this.worshipLeaders.set([]);
      },
    });
}

getMemberPhotoUrl(member: Member): string {
  return this.userService.getPhotoUrl(member.photoUrl);
}

onImageError(event: Event): void {
  const img = event.target as HTMLImageElement;
  // Remplacer par une image par défaut ou initiales
  img.style.display = 'none';
  // ou mettre une image par défaut
  img.src = 'assets/default-avatar.png';
}

  private searchWorshipLeaders(term: string): void {
  this.memberService
    .getMembers({ page: 1, pageSize: 20, fullName: term } as any)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: any) => {
        // ✅ Même structure
        const items = response?.items ?? [];
        this.worshipLeaders.set(items);
      },
      error: (err) => {
        console.error('❌ Erreur searchWorshipLeaders', err);
        this.worshipLeaders.set([]);
      },
    });
}
  // ──────────────────────────────────────────────────────────────
  // GESTION DES ÉQUIPES (FormArray)
  // ──────────────────────────────────────────────────────────────

  /**
 * Récupère le FormArray d'une équipe spécifique
 * @param teamKey - La clé de l'équipe (ex: 'worship', 'sound')
 * @returns Le FormArray correspondant
 */
  getTeamFormArray(teamKey: string): FormArray {
    const control = this.form.get(`team.${teamKey}`);
    if (!control) {
      console.warn(`⚠️ Team "${teamKey}" non trouvée dans le formulaire, création automatique.`);
      // Si le contrôle n'existe pas, on le crée dynamiquement
      const formArray = this.fb.array([]);
      (this.form.get('team') as FormGroup).setControl(teamKey, formArray);
      return formArray;
    }
    return control as FormArray;
  }

  createTeamMemberGroup(member?: TeamMember): FormGroup {
    return this.fb.group({
      memberId: [member?.memberId || ''],
      memberName: [member?.memberName || ''],
      role: [member?.role || 'Autre', Validators.required],
      confirmed: [member?.confirmed || false],
    });
  }

  addTeamMember(teamKey: string): void {
    const formArray = this.getTeamFormArray(teamKey);
    formArray.push(this.createTeamMemberGroup());
  }

  removeTeamMember(teamKey: string, index: number): void {
    const formArray = this.getTeamFormArray(teamKey);
    formArray.removeAt(index);
  }

  // ── Recherche de membre pour ajout dans une équipe ──
  searchMembersForTeam(term: string, teamKey: keyof ServiceTeam, index: number): void {
    if (term && term.trim().length >= 2) {
      this.searchingTeamMember.set({ team: teamKey, index });
      this.memberService
        .getMembers({ page: 1, pageSize: 8, fullName: term } as any)
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              this.teamMemberResults.set(response.data.items as any);
            } else {
              this.teamMemberResults.set([]);
            }
            this.searchingTeamMember.set(null);
          },
          error: () => {
            this.teamMemberResults.set([]);
            this.searchingTeamMember.set(null);
          },
        });
    } else {
      this.teamMemberResults.set([]);
    }
  }

  selectTeamMember(teamKey: keyof ServiceTeam, index: number, member: Member): void {
    const formArray = this.getTeamFormArray(teamKey);
    const group = formArray.at(index) as FormGroup;
    group.patchValue({
      memberId: member.id,
      memberName: `${member.firstName} ${member.lastName}`,
    });
    this.teamMemberResults.set([]);
    this.searchingTeamMember.set(null);
    // Effacer le terme de recherche
    const input = document.querySelector(`input[data-team="${teamKey}"][data-index="${index}"]`) as HTMLInputElement;
    if (input) input.value = '';
  }

  // ──────────────────────────────────────────────────────────────
  // VALIDATION & SOUMISSION
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

    const rawValue = this.form.value;

    const payload: ServiceCreate = {
      title: rawValue.title,
      date: rawValue.date,
      churchId: rawValue.churchId,
      siteId: rawValue.siteId || undefined,
      preacherId: rawValue.preacherId || undefined,
      preacherName: rawValue.preacherSearch || undefined,
      bibleText: rawValue.bibleText || undefined,
      theme: rawValue.theme || undefined,
      songIds: rawValue.songIds || [],
      worshipLeaderId: rawValue.worshipLeaderId || undefined,
      status: rawValue.status || ServiceStatus.Scheduled,
      notes: rawValue.notes || undefined,
      team: this.buildTeamPayload(rawValue.team),
      attendance: {
        members: rawValue.attendance?.members || 0,
        visitors: rawValue.attendance?.visitors || 0,
        children: rawValue.attendance?.children || 0,
        total: (rawValue.attendance?.members || 0) + (rawValue.attendance?.visitors || 0) + (rawValue.attendance?.children || 0),
        visitorNames: rawValue.attendance?.visitorNames || [],
      },
    };

    const request$ = this.isEditMode() && this.serviceId
      ? this.serviceService.update(this.serviceId, payload)
      : this.serviceService.create(payload);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.saving.set(false);
        // ✅ Vérifier la structure de la réponse
        if (response.success && response.data && 'id' in response.data) {
          const id = (response.data as any).id;
          this.router.navigate(['/dashboard/cultes', id]);
        } else {
          this.error.set(response.message || 'Enregistrement reussie.');
        }
      },
      error: (err) => {
        console.error('❌ Erreur:', err);
        this.saving.set(false);
        this.error.set('Une erreur est survenue.');
      },
    });
  }

  private buildTeamPayload(teamValue: any): ServiceTeam {
    const team: ServiceTeam = {
      worship: [],
      sound: [],
      lighting: [],
      welcome: [],
      ushers: [],
      children: [],
      media: [],
      other: [],
    };
    // Pour chaque équipe, transformer les valeurs
    Object.keys(TEAM_ROLES).forEach((key) => {
      const teamKey = key.toLowerCase() as keyof ServiceTeam;
      const members = teamValue[teamKey] || [];
      team[teamKey] = members
        .filter((m: any) => m.memberId) // ignorer les lignes vides
        .map((m: any) => ({
          memberId: m.memberId,
          memberName: m.memberName || '',
          role: m.role || 'Autre',
          confirmed: m.confirmed || false,
        }));
    });
    return team;
  }

  cancel(): void {
    this.router.navigate(['/dashboard/cultes']);
  }

  // ──────────────────────────────────────────────────────────────
  // UTILITAIRES
  // ──────────────────────────────────────────────────────────────

  private formatDateInput(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16);
  }

  getMemberFullName(member: Member): string {
    return `${member.firstName} ${member.lastName}`.trim();
  }

  getMemberInitials(member: Member): string {
    const first = member.firstName?.charAt(0) || '?';
    const last = member.lastName?.charAt(0) || '?';
    return `${first}${last}`.toUpperCase();
  }

  getUserFullName(user: User): string {
    return user.fullName || `${user.firstName} ${user.lastName}`.trim();
  }

  selectPreacher(user: User): void {
    this.form.patchValue({
      preacherId: user.id,
      preacherSearch: this.getUserFullName(user),
    });
    this.preachers.set([]);
  }

  selectWorshipLeader(member: Member): void {
    this.form.patchValue({
      worshipLeaderId: member.id,
      worshipLeaderSearch: this.getMemberFullName(member),
    });
    this.worshipLeaders.set([]);
  }

  clearPreacher(): void {
    this.form.patchValue({ preacherId: '', preacherSearch: '' });
  }

  clearWorshipLeader(): void {
    this.form.patchValue({ worshipLeaderId: '', worshipLeaderSearch: '' });
  }
}
