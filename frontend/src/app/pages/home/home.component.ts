import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStore } from '../../store/app.store';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { OfferBannerComponent } from '../../components/offer-banner/offer-banner.component';
import { HeaderComponent } from '../../components/header/header.component';
import { OfferService, Offer } from '../../services/offer.service';
import { signal, OnInit, computed } from '@angular/core';

import { RouterLink } from '@angular/router';

@Component({
   selector: 'app-home',
   standalone: true,
   imports: [CommonModule, ProductCardComponent, OfferBannerComponent, HeaderComponent, RouterLink],
   template: `
    <app-header></app-header>
    
    <main>
      <!-- Hero Section -->
      <section class="hero shadow-lg">
        <div class="container hero-content fade-in">
          <h1 class="hero-title">Amaneceres con Sabor a Hogar</h1>
          <p class="hero-subtitle">Desayunos y cestas artesanales preparadas con el cariño de nuestra familia para la tuya.</p>
          <div class="hero-btns">
             <button class="btn btn-primary btn-lg" routerLink="/productos">Explorar Desayunos</button>
             <button class="btn btn-secondary btn-lg" (click)="scrollToProducts()">Ver Ofertas</button>
          </div>
        </div>
      </section>

      <section class="container section-padding pb-0">
        <!-- Banners Promocionales -->
        <div class="offers-section mt-4 mb-3" *ngIf="bannerOffers().length > 0">
           <app-offer-banner *ngFor="let offer of bannerOffers()" [offer]="offer"></app-offer-banner>
        </div>

        <!-- Ofertas en formato Rejilla (Primero Productos, luego Cupones) -->
        <div class="product-grid offers-grid mb-5" *ngIf="gridOffers().length > 0">
           <div *ngFor="let offer of gridOffers()" class="grid-item">
              <app-offer-banner [offer]="offer"></app-offer-banner>
           </div>
        </div>
      </section>

      <!-- Featured Collections Section -->
      <section class="container section-padding pt-0">
        <div class="section-header text-center">
          <h2 class="title-font section-title">Nuestros productos más destacados</h2>
          <div class="divider"></div>
          <p class="text-muted">Seleccionadas cuidadosamente para cada ocasión especial.</p>
        </div>

        <div *ngIf="store.loading()" class="loading-state">
           <div class="loader">Cargando la tradición...</div>
        </div>

        <div class="product-grid" *ngIf="!store.loading()">
           <div *ngFor="let product of featuredProducts()" class="grid-item">
             <app-product-card [product]="product"></app-product-card>
           </div>
        </div>
      </section>

      <!-- Tradition Section -->
      <section class="tradition-banner">
         <div class="container banner-grid">
            <div class="banner-text">
               <h2 class="title-font">Valores que Perduran</h2>
               <p>En "Desayuno con Diamante" creemos en la sencillez, el trato familiar y la calidad extrema en cada detalle. Llevamos años transportando momentos felices a vuestras casas.</p>
               <ul class="values-list">
                  <li>
                    <svg class="value-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                    Elaboración Artesanal
                  </li>
                  <li>
                    <svg class="value-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    Sabor de Casa
                  </li>
                  <li>
                    <svg class="value-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polyline points="16 8 20 8 23 11 23 16 16 16 16 8"></polyline><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                    Entrega con Cariño
                  </li>
               </ul>
            </div>
            <div class="banner-image">
               <!-- Placeholder for a warm family image -->
               <div class="warm-image-placeholder"></div>
            </div>
         </div>
      </section>
    </main>
   `,
   styles: [`
    .hero {
      background: linear-gradient(rgba(139, 69, 19, 0.4), rgba(230, 126, 34, 0.2)), 
                  url('/assets/images/desayuno_con_diamantes.webp');
      background-size: cover;
      background-position: center;
      height: 60vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      color: white;
      margin-bottom: 1rem;
    }
    .hero-content {
      background: rgba(255, 253, 240, 0.1);
      backdrop-filter: blur(8px);
      padding: 3rem;
      border-radius: var(--radius-lg);
      border: 1px solid rgba(255,255,255,0.2);
    }
    .hero-title {
      font-size: 4rem;
      color: white;
      margin-bottom: 1rem;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      line-height: 1.1;
    }
    .hero-subtitle {
      font-size: 1.5rem;
      max-width: 800px;
      margin: 0 auto 2rem;
      line-height: 1.4;
    }
    .hero-btns {
       display: flex;
       gap: 1.5rem;
       justify-content: center;
    }
    .btn-lg {
       font-size: 1.1rem;
       padding: 1rem 2.5rem;
    }
    .hero-btns .btn-secondary {
       border: 2px solid white;
       color: white;
       background: transparent;
       font-weight: 700;
       text-shadow: 1px 1px 2px rgba(0,0,0,0.4);
    }
    .hero-btns .btn-secondary:hover {
       background: white;
       color: var(--primary);
       text-shadow: none;
    }
    .section-header {
       margin-bottom: 3rem;
       padding: 0 1rem;
    }
    .section-title {
       font-size: 2.5rem;
       line-height: 1.2;
    }
    .divider {
       width: 80px;
       height: 4px;
       background: var(--secondary);
       margin: 1rem auto;
       border-radius: 2px;
    }
    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 2.5rem;
      margin-top: 2rem;
    }
    .offers-grid {
      margin-bottom: 2rem;
    }
    .tradition-banner {
       background: #FFF8E1;
       padding: 4rem 0;
       margin-top: 2rem;
    }
    .banner-grid {
       display: grid;
       grid-template-columns: 1fr 1fr;
       align-items: center;
       gap: 4rem;
    }
    .values-list {
       margin-top: 2rem;
       display: flex;
       flex-direction: column;
       gap: 1.5rem;
    }
    .values-list li {
       font-weight: 600;
       color: var(--primary);
       font-size: 1.1rem;
       display: flex;
       align-items: center;
       gap: 1.2rem;
    }
    .value-icon {
       width: 28px;
       height: 28px;
       color: var(--secondary);
       flex-shrink: 0;
    }
    .warm-image-placeholder {
       height: 400px;
       border-radius: var(--radius-lg);
       box-shadow: 0 20px 40px rgba(0,0,0,0.08);
       background-image: url('/assets/images/familia-tradicion.webp');
       background-size: cover;
       background-position: center;
    }
    @media (max-width: 992px) {
       .hero-title { font-size: 3rem; }
       .hero-subtitle { font-size: 1.2rem; }
       .banner-grid { gap: 2rem; }
    }

    @media (max-width: 768px) {
       .hero { height: auto; min-height: 50vh; padding: 4rem 1rem; margin-bottom: 2rem; }
       .hero-content { padding: 2rem 1.2rem; width: 95%; max-width: 400px; }
       .hero-title { font-size: 2.2rem; margin-bottom: 0.8rem; }
       .hero-subtitle { font-size: 1.05rem; margin-bottom: 1.5rem; line-height: 1.3; }
       .hero-btns { flex-direction: column; gap: 0.8rem; }
       .hero-btns button { width: 100%; padding: 0.8rem; font-size: 1rem; }

       .banner-grid { grid-template-columns: 1fr; gap: 3rem; }
       .banner-text { text-align: center; padding: 0 1.5rem; }
       .warm-image-placeholder { height: 300px; }
       
       .section-header { margin-bottom: 2rem; }
       .section-title { font-size: 1.8rem; }
       
       .product-grid { grid-template-columns: 1fr; gap: 2.5rem; }
    }
   `]
})
export class HomeComponent implements OnInit {
   store = inject(AppStore);
   offerService = inject(OfferService);

   activeOffers = signal<Offer[]>([]);

   bannerOffers = computed(() => this.activeOffers().filter(o => o.type === 'banner'));
   gridOffers = computed(() => {
      // 1. Primero las ofertas de tipo producto
      const productDeals = this.activeOffers().filter(o => o.type === 'product_deal');
      // 2. Luego las ofertas de tipo descuento/cupÃ³n
      const coupons = this.activeOffers().filter(o => o.type === 'coupon');
      return [...productDeals, ...coupons];
   });

   featureExcludes = computed(() => {
      return this.activeOffers()
         .filter(o => o.type === 'product_deal' && o.productId)
         .map(o => o.productId!);
   });

   featuredProducts = () => {
      const excl = this.featureExcludes();
      return this.store.resources().filter(p => 
         p.showOnHome === true && 
         !excl.includes(p.id)
      );
   };

   async ngOnInit() {
      const offers = await this.offerService.getActiveOffers();
      this.activeOffers.set(offers);
   }

   scrollToProducts() {
      document.querySelector('.section-header')?.scrollIntoView({ behavior: 'smooth' });
   }
}

