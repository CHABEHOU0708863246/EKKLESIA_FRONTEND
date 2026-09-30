import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { UploadProgressService } from '../../services/Uploads/upload-progress.service';

/**
 * Barre d'envoi globale : s'affiche dès qu'un fichier (photo, document) est en
 * cours d'envoi, quel que soit l'écran.
 */
@Component({
  selector: 'app-upload-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (progress.active()) {
      <div class="upload-progress" role="progressbar" aria-label="Envoi en cours" aria-live="polite">
        <div class="upload-progress__bar"></div>
        <span class="upload-progress__text">Envoi en cours…</span>
      </div>
    }
  `,
  styles: [`
    .upload-progress {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 4px;
      z-index: 3000;
      background: rgba(108, 92, 231, 0.15);
    }
    .upload-progress__bar {
      height: 100%;
      width: 35%;
      background: #6C5CE7;
      animation: upload-slide 1.1s ease-in-out infinite;
    }
    .upload-progress__text {
      position: absolute;
      top: 8px; right: 12px;
      font-size: 12px;
      color: #6C5CE7;
      background: #fff;
      padding: 2px 8px;
      border-radius: 10px;
      box-shadow: 0 1px 4px rgba(0,0,0,.12);
    }
    @keyframes upload-slide {
      0% { transform: translateX(-40%); }
      100% { transform: translateX(300%); }
    }
  `],
})
export class UploadProgressComponent {
  progress = inject(UploadProgressService);
}
