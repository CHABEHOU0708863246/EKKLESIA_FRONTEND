
import { CommonModule, DecimalPipe, DatePipe, SlicePipe } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
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
@ViewChild('sceneWrapper') sceneWrapper!: ElementRef;

  private mouseX = 0;
  private mouseY = 0;
  private targetRotationX = 0;
  private targetRotationY = 0;
  private currentRotationX = 0;
  private currentRotationY = 0;
  private animationFrame: any;

  constructor(private location: Location) {}

  onMouseMove(event: MouseEvent): void {
    const rect = this.sceneWrapper?.nativeElement?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    this.mouseX = (event.clientX - centerX) / (rect.width / 2);
    this.mouseY = (event.clientY - centerY) / (rect.height / 2);

    // Limite de rotation
    this.targetRotationX = this.mouseY * -15;
    this.targetRotationY = this.mouseX * 15;
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    this.onMouseMove(event);
  }

  ngAfterViewInit(): void {
    this.animateCube();
  }

  ngOnDestroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  animateCube(): void {
    // Interpolation lissée
    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.08;
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.08;

    // Application au style de l'élément
    const scene = this.sceneWrapper?.nativeElement?.querySelector('.scene-3d');
    if (scene) {
      scene.style.transform = `rotateX(${this.currentRotationX}deg) rotateY(${this.currentRotationY}deg)`;
    }

    this.animationFrame = requestAnimationFrame(() => this.animateCube());
  }

  goBack(): void {
    this.location.back();
  }

  // Pour Angular, on peut utiliser un getter pour le template
  getSceneTransform(): string {
    return `rotateX(${this.currentRotationX}deg) rotateY(${this.currentRotationY}deg)`;
  }
}

