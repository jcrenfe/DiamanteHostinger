import { Component, Input, Output, EventEmitter, inject, ElementRef, AfterViewInit, OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SlicePipe, NgIf } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ResourceMap } from '../../store/app.store';
import { CartStore } from '../../store/cart.store';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [SlicePipe, NgIf, RouterModule],
  template: `
    <div class="fade-in" style="height: 100%;">
      <div class="card-container" [class.mobile-hover]="isMobileHover()">
        <div class="card-image-wrap" [routerLink]="previewMode ? null : ['/producto', product.id]" (click)="handleCardClick($event)">
          <img [src]="product.local_image_path || 'assets/images/placeholder.jpg'" 
               [alt]="product.name || 'Producto'" 
               loading="lazy" 
               class="card-image"
               (load)="onImgLoad($event)"
               (error)="onImgError($event)">
          <div class="overlay" *ngIf="getPriceDisplay()">
             <span class="price-badge">{{ getPriceDisplay() }}</span>
          </div>
        </div>
        
        <div class="card-content">
          <h3 class="product-title" [routerLink]="previewMode ? null : ['/producto', product.id]" (click)="handleCardClick($event)">{{ product.name }}</h3>
          <p class="product-description" *ngIf="product.description">
             {{ product.description | slice:0:120 }}{{ product.description.length > 120 ? '...' : '' }}
          </p>
          <div class="card-footer">
            <button class="btn btn-secondary" [routerLink]="previewMode ? null : ['/producto', product.id]" (click)="handleCardClick($event)">Detalles</button>
            <button class="btn btn-primary add-btn" (click)="addToCart($event)" [disabled]="previewMode">
               <span>+ Carrito</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card-container {
      background: var(--surface);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.04);
      border: 1px solid rgba(139, 69, 19, 0.1);
      transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.2), 
                  box-shadow 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.2), 
                  border-color 0.6s ease;
      height: 100%;
      display: flex;
      flex-direction: column;
      will-change: transform, box-shadow;
    }

    /* Versión Escritorio: Solo si el dispositivo permite hover real */
    @media (hover: hover) {
      .card-container:hover {
        transform: scale(1.03);
        box-shadow: 0 22px 45px rgba(139, 69, 19, 0.18);
        border-color: var(--secondary);
      }
      .card-container:hover .card-image {
        transform: scale(1.05);
      }
    }

    /* Versión Móvil/Tablet: Activado por IntersectionObserver (isMobileHover signal) */
    .card-container.mobile-hover {
      transform: scale(1.03);
      box-shadow: 0 22px 45px rgba(139, 69, 19, 0.18);
      border-color: var(--secondary);
    }
    .card-container.mobile-hover .card-image {
      transform: scale(1.05);
    }

    .card-image-wrap {
      position: relative;
      padding-top: 75%; /* 4:3 Ratio */
      overflow: hidden;
      background: #F8EFE4;
    }
    .card-image {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      object-fit: cover;
      transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s ease-in;
    }
    .overlay {
      position: absolute;
      top: 1rem;
      right: 1rem;
    }
    .price-badge {
      background: var(--primary);
      color: white;
      padding: 0.4rem 0.8rem;
      border-radius: var(--radius-md);
      font-weight: 700;
      font-size: 0.8em;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }
    .card-content {
      padding: 1.5rem;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .product-title {
      font-size: 1.1em;
      color: var(--primary);
      margin-bottom: 0.5rem;
      font-family: var(--font-title);
    }
    .product-description {
      font-size: 0.85em;
      color: var(--text-muted);
      margin-bottom: 1.5rem;
      flex: 1;
    }
    .card-footer {
      display: flex;
      gap: 1rem;
      margin-top: auto;
    }
    .add-btn {
       flex: 1;
       font-size: 0.8em;
       padding: 0.6rem 1.2rem;
    }
    /* Simple slice pipe equivalent manually if needed but using slice from common */
  `]
})
export class ProductCardComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) product!: ResourceMap;
  @Input() previewMode: boolean = false;
  @Output() previewClick = new EventEmitter<void>();

  cart = inject(CartStore);
  private el = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);

  isMobileHover = signal(false);
  private observer: IntersectionObserver | null = null;

  onImgLoad(event: any) {
    event.target.classList.add('loaded');
  }

  onImgError(event: any) {
    event.target.src = 'assets/images/placeholder.jpg';
  }

  getPriceDisplay(): string {
    if (this.product?.priceStr) {
      return this.product.priceStr;
    }
    const rawPrice = this.product?.price ?? (this.product as any)?.precio;
    if (rawPrice !== undefined && rawPrice !== null && !isNaN(rawPrice) && rawPrice > 0) {
      return `€${Number(rawPrice).toFixed(2).replace('.', ',')} EUR`;
    }
    return '';
  }

  handleCardClick(event: MouseEvent) {
    if (this.previewMode) {
      event.preventDefault();
      event.stopPropagation();
      this.previewClick.emit();
    }
  }

  addToCart(event: MouseEvent) {
    event.stopPropagation();
    if (this.previewMode) return;
    this.cart.addItem(this.product);
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId) && window.innerWidth <= 768) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          // Trigger when card is substantially visible
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            this.isMobileHover.set(true);
          } else {
            this.isMobileHover.set(false);
          }
        });
      }, {
        threshold: [0.65, 0.7, 0.75, 1.0]
      });

      this.observer.observe(this.el.nativeElement);
    }
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}
