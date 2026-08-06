import { Component, Input, inject, computed, ElementRef, AfterViewInit, OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Offer } from '../../services/offer.service';
import { AppStore } from '../../store/app.store';
import { ProductCardComponent } from '../product-card/product-card.component';
import { ImageUrlPipe } from '../../pipes/image-url.pipe';

@Component({
  selector: 'app-offer-banner',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, ImageUrlPipe],
  template: `
    <ng-container *ngIf="offer">
      <div *ngIf="offer.type !== 'product_deal'" class="promo-banner fade-in" [class]="offer.type" [class.mobile-hover]="isMobileHover()"
           [style.backgroundImage]="offer.backgroundImage ? 'url(' + (offer.backgroundImage | imageUrl) + ')' : null"
           [style.backgroundColor]="offer.backgroundColor || null"
           [style.backgroundSize]="offer.backgroundImage ? 'cover' : null"
           [style.backgroundPosition]="offer.backgroundImage ? 'center' : null">
        <div class="banner-content">
          <div class="offer-badge" *ngIf="offer.type === 'coupon'">CUPÓN DISPONIBLE</div>
          
          <h2 class="title-font">{{ offer.title }}</h2>
          <p>{{ offer.description }}</p>
          
          <div class="code-box" *ngIf="offer.code" (click)="copyCode(offer.code)">
             <span>Usa el código:</span>
             <strong>{{ offer.code }}</strong>
             <small class="copy-hint" *ngIf="!copied">Haga clic para copiar</small>
             <small class="copy-hint" *ngIf="copied">¡Copiado!</small>
          </div>
        </div>
        <div class="offer-amount" *ngIf="offer.discountPercent">
           -{{ offer.discountPercent }}%
        </div>
      </div>

      <div *ngIf="offer.type === 'product_deal' && product()" class="product-deal-wrapper fade-in">
        <div class="ribbon" *ngIf="offer.ribbonText"
             [style.backgroundColor]="offer.ribbonColor || '#e67e22'"
             [style.color]="offer.ribbonTextColor || '#ffffff'">
           {{ offer.ribbonText }}
        </div>
        <app-product-card [product]="product()!"></app-product-card>
      </div>
    </ng-container>
  `,
  styles: [`
    .promo-banner {
      background: var(--primary);
      color: white;
      padding: 2.5rem;
      border-radius: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 2rem 0;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      position: relative;
      overflow: hidden;
    }
    .promo-banner::after {
      content: '\\2728\\FE0E';
      position: absolute;
      font-size: 10rem;
      right: -2rem;
      bottom: -3rem;
      opacity: 0.1;
    }
    
    .promo-banner.coupon { 
       background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
       flex-direction: column; 
       text-align: center;
       gap: 1.5rem;
       height: 100%;
       margin: 0;
       padding: 2rem 1.5rem;
       transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
       will-change: transform, box-shadow;
    }
    .promo-banner.coupon:hover, .promo-banner.coupon.mobile-hover {
       transform: scale(1.03);
       box-shadow: 0 22px 45px rgba(16, 185, 129, 0.35);
    }
    .promo-banner.coupon .offer-amount { order: -1; font-size: 3.5rem; }
    .promo-banner.product_deal { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }

    .banner-content { flex: 1; }
    .offer-badge { 
      display: inline-block; padding: 0.3rem 0.8rem; border-radius: 20px; 
      background: rgba(255,255,255,0.2); font-size: 0.7em; font-weight: 800; 
      margin-bottom: 1rem; border: 1px solid rgba(255,255,255,0.3);
    }
    
    h2 { font-size: 2em; margin-bottom: 0.5rem; }
    p { font-size: 1.1em; opacity: 0.9; margin-bottom: 1.5rem; }

    .code-box { 
      display: inline-flex; flex-direction: column; background: rgba(0,0,0,0.1); 
      padding: 1rem 2rem; border-radius: 12px; border: 2px dashed rgba(255,255,255,0.4);
      cursor: pointer; transition: 0.3s;
    }
    .code-box:hover { background: rgba(0,0,0,0.2); }
    .code-box strong { font-size: 1.8rem; font-family: monospace; letter-spacing: 2px; }
    .copy-hint { font-size: 0.7rem; opacity: 0.7; margin-top: 0.5rem; text-transform: uppercase; }

    .offer-amount { 
      font-size: 4rem; font-weight: 900; background: rgba(255,255,255,0.15); 
      padding: 1rem 2rem; border-radius: 16px; transform: rotate(-5deg);
    }
    
    .product-deal-wrapper {
        position: relative;
        margin: 0;
        max-width: 100%;
        height: 100%;
    }
    .ribbon {
        position: absolute;
        top: -15px;
        right: -15px;
        z-index: 10;
        padding: 0.8rem 1.5rem;
        background: var(--secondary);
        color: white;
        font-weight: 800;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        transform: rotate(5deg);
        font-size: 0.9em;
        border: 2px solid white;
    }
    :host {
        display: block;
        height: 100%;
    }

    @media (max-width: 768px) {
      .promo-banner { flex-direction: column; text-align: center; gap: 2rem; padding: 1.5rem; border-radius: 12px; }
      .offer-amount { order: -1; font-size: 3rem; }
      h2 { font-size: 1.8rem; }
      .code-box { padding: 0.8rem 1rem; }
      .code-box strong { font-size: 1.2rem; }
    }
  `]
})
export class OfferBannerComponent implements AfterViewInit, OnDestroy {
  @Input() offer!: Offer;
  store = inject(AppStore);
  private el = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);

  isMobileHover = signal(false);
  private observer: IntersectionObserver | null = null;
  copied = false;

  product = computed(() => {
    if (this.offer?.type === 'product_deal' && this.offer.productId) {
      return this.store.resources().find(r => r.id === this.offer.productId);
    }
    return null;
  });

  copyCode(code: string) {
    navigator.clipboard.writeText(code);
    this.copied = true;
    setTimeout(() => this.copied = false, 2000);
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId) && window.innerWidth <= 768) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            this.isMobileHover.set(true);
          } else {
            this.isMobileHover.set(false);
          }
        });
      }, {
        threshold: [0, 0.7, 1.0]
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
