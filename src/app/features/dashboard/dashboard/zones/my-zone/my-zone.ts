// my-zone.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { ZoneResponse } from '../../../../../core/models/Zones/zone.model';
import { ZoneUtils } from '../../../../../core/models/Zones/zone.utils';
import { ZoneService } from '../../../../../core/services/Zones/zone-service';


@Component({
  selector: 'app-my-zone',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-zone.html',
  styleUrl: './my-zone.scss',
})
export class MyZone implements OnInit {
  zone = signal<ZoneResponse | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  notChief = signal(false);

  constructor(private zoneService: ZoneService) {}

  ngOnInit(): void {
    this.loading.set(true);
    this.zoneService.getMyZone().subscribe((res) => {
      this.loading.set(false);
      if (!res.success) {
        this.notChief.set(true);
        return;
      }
      this.zone.set(res.data);
    });
  }

  getInitials(name: string): string {
    return ZoneUtils.getInitials(name);
  }

  getSiteCountLabel(zone: ZoneResponse): string {
    return ZoneUtils.getSiteCountLabel(zone.siteCount ?? zone.siteIds.length);
  }
}
