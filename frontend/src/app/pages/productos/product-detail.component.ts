import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AppStore } from '../../store/app.store';
import { CartStore } from '../../store/cart.store';
import { HeaderComponent } from '../../components/header/header.component';

import { ProductDetailViewComponent } from '../../components/product-detail-view/product-detail-view.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, ProductDetailViewComponent],
  template: `
    <app-header></app-header>
    
    <main class="product-detail-page container section-padding" *ngIf="product(); else notFound">
      <app-product-detail-view 
          [product]="product()!" 
          (onAddToCart)="addToCart($event)">
      </app-product-detail-view>
    </main>

    <ng-template #notFound>
       <div class="container section-padding text-center" *ngIf="!store.loading()">
         <h2>Vaya, no hemos encontrado ese producto</h2>
         <p>Parece que el desayuno que buscas se ha acabado.</p>
         <button class="btn btn-primary" routerLink="/productos">Ver otros productos</button>
       </div>
    </ng-template>
  `,
  styles: [`
    .product-detail-page {
      margin-top: 2rem;
    }
  `]
})
export class ProductDetailComponent {
  route = inject(ActivatedRoute);
  store = inject(AppStore);
  cart = inject(CartStore);

  product = computed(() => {
    const slug = this.route.snapshot.paramMap.get('slug');
    return this.store.resources().find(r => r.id === slug);
  });

  addToCart(quantity: number) {
    const p = this.product();
    if (p) {
      this.cart.addItem(p, quantity);
    }
  }
}
