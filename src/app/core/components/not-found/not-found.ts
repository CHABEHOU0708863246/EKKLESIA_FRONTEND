import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-not-found',
  imports: [
    CommonModule,
    RouterModule
  ],
  standalone: true,
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {
  constructor(private location: Location) {}

  goBack(): void {
    this.location.back();
  }
}
