// zone-edit.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ZoneResponse } from '../../../../../core/models/Zones/zone.model';
import { Users } from '../../../../../core/services/Users/users';
import { ZoneService } from '../../../../../core/services/Zones/zone-service';
import { Church  } from '../../../../../core/services/Church/church';


interface SiteOption { id: string; name: string; churchName: string; }
interface ChurchOption { id: string; name: string; }
interface UserOption { id: string; fullName: string; }

@Component({
  selector: 'app-zone-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  templateUrl: './zone-edit.html',
  styleUrl: './zone-edit.scss',
})
export class ZoneEdit implements OnInit {
  zoneId!: string;
  zone = signal<ZoneResponse | null>(null);
  form: FormGroup;
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);

  churches = signal<ChurchOption[]>([]);
  allSites = signal<SiteOption[]>([]);
  users = signal<UserOption[]>([]);
  newChiefId = signal('');
  siteToAdd = signal('');

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private zoneService: ZoneService,
    private churchService: Church,
    private usersService: Users
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      churchId: [''],
    });
  }

  ngOnInit(): void {
    this.zoneId = this.route.snapshot.paramMap.get('id')!;
    this.loadZone();
    this.loadChurchesAndSites();
    this.loadUsers();
  }

  loadZone(): void {
    this.loading.set(true);
    this.zoneService.getZone(this.zoneId).subscribe((res) => {
      this.loading.set(false);
      if (!res.success) { this.error.set(res.message); return; }
      this.zone.set(res.data);
      this.form.patchValue({ name: res.data.name, churchId: res.data.churchId || '' });
      this.newChiefId.set(res.data.chiefUserId);
    });
  }

  private loadChurchesAndSites(): void {
    this.churchService.getAllChurches().subscribe((res: any) => {
      if (!res.success) return;
      const churchList: ChurchOption[] = [];
      const siteList: SiteOption[] = [];
      for (const church of res.data) {
        churchList.push({ id: church.id, name: church.name });
        for (const site of church.sites ?? []) {
          siteList.push({ id: site.id, name: site.name, churchName: church.name });
        }
      }
      this.churches.set(churchList);
      this.allSites.set(siteList);
    });
  }

  private loadUsers(): void {
  this.usersService.getUsers({ page: 1, pageSize: 100 }).subscribe((res) => {
    if (res.success && res.data) {
      this.users.set(res.data.items.map((u: any) => ({
        id: u.id,
        fullName: u.fullName || u.username || u.email
      })));
    }
  });
}

  siteName(siteId: string): string {
    return this.allSites().find((s) => s.id === siteId)?.name ?? siteId;
  }

  get availableSitesToAdd(): SiteOption[] {
    const current = this.zone()?.siteIds ?? [];
    return this.allSites().filter((s) => !current.includes(s.id));
  }

  saveInfo(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.zoneService.updateZone(this.zoneId, this.form.value).subscribe((res) => {
      this.saving.set(false);
      if (!res.success) { this.error.set(res.message); return; }
      this.loadZone();
    });
  }

  assignChief(): void {
    if (!this.newChiefId()) return;
    this.zoneService.assignChief(this.zoneId, this.newChiefId()).subscribe((res) => {
      if (!res.success) { this.error.set(res.message); return; }
      this.loadZone();
    });
  }

  addSite(): void {
    if (!this.siteToAdd()) return;
    this.zoneService.addSite(this.zoneId, this.siteToAdd()).subscribe((res) => {
      if (!res.success) { this.error.set(res.message); return; }
      this.siteToAdd.set('');
      this.loadZone();
    });
  }

  removeSite(siteId: string): void {
    this.zoneService.removeSite(this.zoneId, siteId).subscribe((res) => {
      if (!res.success) { this.error.set(res.message); return; }
      this.loadZone();
    });
  }

  cancel(): void {
    this.router.navigate(['/dashboard/admin/zones']);
  }
}
