import { CommonModule, Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Token } from '../../services/Token/token';

@Component({
  selector: 'app-unauthorized-component',
  imports: [CommonModule, RouterModule],
  templateUrl: './unauthorized-component.html',
  styleUrl: './unauthorized-component.scss',
})
export class UnauthorizedComponent {
  private location = inject(Location);
  private tokenService = inject(Token);

  /** Vrai si l'utilisateur est authentifié : oriente le message. */
  readonly isLogged = this.tokenService.isLogged();

  goBack(): void {
    this.location.back();
  }
}
