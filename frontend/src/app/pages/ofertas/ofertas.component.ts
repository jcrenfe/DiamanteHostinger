import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OfferService, Offer } from '../../services/offer.service';
import { HeaderComponent } from '../../components/header/header.component';
import { OfferBannerComponent } from '../../components/offer-banner/offer-banner.component';

@Component({
  selector: 'app-ofertas',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, OfferBannerComponent],
  template: `
    <app-header></app-header>
    
    <main class="offers-page">
      <section class="page-header shadow-lg">
        <div class="container page-header-content fade-in">
          <h1 class="title-font">Ofertas Especiales</h1>
          <p>Los mejores momentos, ahora con un sabor aún más dulce.</p>
        </div>
      </section>

      <div class="container section-padding">
        <!-- Loading State -->
        <div *ngIf="loading()" class="loading-state">
           <div class="loader">Buscando las mejores ofertas...</div>
        </div>

        <!-- Active Offers Grid -->
        <ng-container *ngIf="!loading()">
          <div *ngIf="activeOffers().length > 0" class="offers-container">
            <!-- Banners -->
            <div class="banners-section mb-5" *ngIf="bannerOffers().length > 0">
               <app-offer-banner *ngFor="let offer of bannerOffers()" [offer]="offer"></app-offer-banner>
            </div>

            <!-- Grid (Products & Coupons) -->
            <div class="offers-grid" *ngIf="gridOffers().length > 0">
               <div *ngFor="let offer of gridOffers()" class="grid-item">
                  <app-offer-banner [offer]="offer"></app-offer-banner>
               </div>
            </div>
          </div>

          <!-- Empty State -->
          <div *ngIf="activeOffers().length === 0" class="empty-state-card fade-in">
            <div class="empty-content">
              <div class="image-container">
                <img src="/assets/images/desayuno_con_diamantes.webp" alt="Próximas ofertas" class="empty-image">
                <div class="image-overlay"></div>
              </div>
              <div class="text-container">
                <h2 class="title-font">¡Estamos preparando algo especial!</h2>
                <p class="description">En este momento no tenemos ofertas activas. ¡Estamos preparando nuestra próxima sorpresa!</p>
                <div class="divider"></div>
                <p class="sub-text">Mientras tanto, puedes explorar nuestra carta completa.</p>
                <button routerLink="/productos" class="btn btn-primary btn-lg mt-3">Ver todos los desayunos</button>
              </div>
            </div>
          </div>
        </ng-container>
      </div>
    </main>
  `,
  styles: [`
    .offers-page {
      min-height: 80vh;
      background: #fdfcf9;
    }
    .page-header {
      background: linear-gradient(rgba(139, 69, 19, 0.4), rgba(230, 126, 34, 0.2)), 
                  url('/assets/images/desayuno_con_diamantes.webp');
      background-size: cover;
      background-position: center;
      padding: 6rem 0;
      text-align: center;
      margin-bottom: 3rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .page-header-content {
      background: rgba(255, 253, 240, 0.1);
      backdrop-filter: blur(8px);
      padding: 3rem;
      border-radius: var(--radius-lg);
      border: 1px solid rgba(255,255,255,0.2);
      color: white;
      max-width: 800px;
    }
    .page-header h1 {
      font-size: 3.5rem;
      color: white;
      margin-bottom: 0.5rem;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      line-height: 1.1;
    }
    .page-header p {
      font-size: 1.3rem;
      text-shadow: 1px 1px 3px rgba(0,0,0,0.3);
    }

    .offers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 2.5rem;
    }

    @media (max-width: 768px) {
       .offers-grid {
          grid-template-columns: 1fr;
          gap: 2rem;
       }
    }

    /* Empty State Modern Styling */
    .empty-state-card {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.05);
      border: 1px solid #f0e6d2;
    }
    .empty-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      align-items: center;
    }
    .image-container {
      position: relative;
      height: 450px;
      overflow: hidden;
    }
    .empty-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s ease;
    }
    .empty-state-card:hover .empty-image {
      transform: scale(1.05);
    }
    .image-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(to right, transparent, rgba(255,255,255,0.1));
    }
    .text-container {
      padding: 4rem;
      text-align: left;
    }
    .text-container h2 {
      font-size: 2.2rem;
      color: var(--primary);
      margin-bottom: 1.5rem;
      line-height: 1.2;
    }
    .description {
      font-size: 1.25rem;
      color: var(--text-dark);
      margin-bottom: 2rem;
      line-height: 1.5;
    }
    .divider {
      width: 60px;
      height: 3px;
      background: var(--secondary);
      margin-bottom: 2rem;
    }
    .sub-text {
      color: var(--text-muted);
      font-style: italic;
      margin-bottom: 1.5rem;
    }

    @media (max-width: 900px) {
      .empty-content {
        grid-template-columns: 1fr;
      }
      .image-container {
        height: 300px;
      }
      .text-container {
        padding: 3rem 2rem;
        text-align: center;
      }
      .text-container h2 { font-size: 1.8rem; }
      .divider { margin: 1.5rem auto; }
      .page-header h1 { font-size: 2.5rem; }
      .page-header p { font-size: 1.1rem; }
    }
  `]
})
export class OfertasComponent implements OnInit {
  offerService = inject(OfferService);
  activeOffers = signal<Offer[]>([]);
  loading = signal(true);

  bannerOffers = computed(() => this.activeOffers().filter(o => o.type === 'banner'));
  gridOffers = computed(() => {
    const productDeals = this.activeOffers().filter(o => o.type === 'product_deal');
    const coupons = this.activeOffers().filter(o => o.type === 'coupon');
    return [...productDeals, ...coupons];
  });

  async ngOnInit() {
    try {
      await this.offerService.loadOffers();
      const offers = await this.offerService.getActiveOffers();
      this.activeOffers.set(offers);
    } catch (err) {
    } finally {
      this.loading.set(false);
    }
  }
}
