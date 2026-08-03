import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppStore } from '../../store/app.store';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { HeaderComponent } from '../../components/header/header.component';
import { OfferService } from '../../services/offer.service';
import { CategoryService } from '../../services/category.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductCardComponent, HeaderComponent],
  template: `
    <app-header></app-header>
    
    <main class="products-page">
      <!-- Hero Header matching home -->
      <section class="page-header shadow-lg">
        <div class="container page-header-content fade-in">
          <h1 class="title-font">Nuestras Cestas y Detalles</h1>
          <p>Explora nuestra selección artesanal para cada momento especial.</p>
        </div>
      </section>

      <section class="container section-padding">
        <!-- Filter Bar -->
        <div class="filter-bar">
          <button 
            *ngFor="let cat of displayCategories()" 
            class="filter-btn" 
            [class.active]="activeCategory() === cat.id"
            (click)="activeCategory.set(cat.id!)">
            {{ cat.name }}
          </button>
        </div>

        <div *ngIf="store.loading()" class="loading-state">
           <div class="loader">Preparando el catálogo...</div>
        </div>

        <div class="product-grid" *ngIf="!store.loading()">
           <div *ngFor="let product of filteredProducts()" class="grid-item">
             <app-product-card [product]="product"></app-product-card>
           </div>
        </div>

        <div *ngIf="!store.loading() && filteredProducts().length === 0" class="empty-state">
           <p>No hemos encontrado productos en esta categoría.</p>
           <button class="btn btn-primary" (click)="activeCategory.set('all')">Ver todo</button>
        </div>
      </section>
    </main>
  `,
  styles: [`
    .products-page {
      min-height: 80vh;
    }
    .page-header {
      background: linear-gradient(rgba(139, 69, 19, 0.4), rgba(230, 126, 34, 0.2)), 
                  url('/assets/images/desayuno_con_diamantes.png');
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
    .filter-bar {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 3rem;
      flex-wrap: wrap;
    }
    .filter-btn {
      padding: 0.6rem 1.5rem;
      border-radius: 50px;
      border: 1px solid #ddd;
      background: white;
      cursor: pointer;
      font-weight: 600;
      color: var(--text-muted);
      transition: all 0.3s ease;
    }
    .filter-btn:hover {
      border-color: var(--secondary);
      color: var(--secondary);
    }
    .filter-btn.active {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }
    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 2.5rem;
      margin-top: 2rem;
    }
    .offers-grid {
      margin-bottom: 4rem;
    }
    .empty-state {
       text-align: center;
       padding: 4rem;
    }

    @media (max-width: 768px) {
       .page-header { padding: 4rem 1rem; margin-bottom: 2rem; }
       .page-header-content { padding: 2rem 1.2rem; width: 95%; max-width: 400px; }
       .page-header h1 { font-size: 2.2rem; }
       .page-header p { font-size: 1.05rem; }
       
       .product-grid {
          grid-template-columns: 1fr;
          gap: 2.5rem;
       }
    }
  `]
})
export class ProductListComponent implements OnInit {
  store = inject(AppStore);
  offerService = inject(OfferService);
  activeCategory = signal('all');
  categoryService = inject(CategoryService);

  async ngOnInit() {
    this.categoryService.loadCategories();
    await this.offerService.loadOffers();
  }

  displayCategories = computed(() => {
    return [{ id: 'all', name: 'Todo' }, ...this.categoryService.categories()];
  });

  filteredProducts = computed(() => {
    // 🔥 Remove restrictive 'tipo === asociado' filter as Firestore products 
    // might not have it or have different formatting. Focus on core validity.
    const rawAll = this.store.resources().filter(r => !!r.name);
    
    // Sort all products by their category's display order (1 to 5, as requested)
    const categoryOrderMap = new Map(this.categoryService.categories().map(c => [c.name, c.order ?? 99]));
    
    const all = rawAll.sort((a, b) => {
       const orderA = categoryOrderMap.get(a.category || '') ?? 99;
       const orderB = categoryOrderMap.get(b.category || '') ?? 99;
       
       if (orderA !== orderB) return orderA - orderB;
       return (a.name || '').localeCompare(b.name || '');
    });

    const catId = this.activeCategory();
    if (catId === 'all') return all;
    
    // Find the category name corresponding to the active ID
    const catName = this.categoryService.categories().find(c => c.id === catId)?.name;
    if (!catName) return all;
    
    return all.filter(p => p.category === catName);
  });
}
