import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourceMap } from '../../store/app.store';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-product-detail-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="product-detail-view" *ngIf="product">
      <div class="detail-grid fade-in">
        <!-- Image Gallery -->
        <div class="product-gallery">
          <div class="main-image-wrap shadow-lg">
             <img [src]="product.local_image_path || 'assets/images/placeholder.jpg'" 
                  [alt]="product.name"
                  (error)="onImgError($event)">
          </div>

          <div class="delivery-info">
             <p><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polyline points="16 8 20 8 23 11 23 16 16 16 16 8"></polyline><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg> <strong>Envío Express:</strong> Entrega garantizada en la fecha seleccionada.</p>
             <p><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.2 12c4.6-2 7.8-5.2 9.8-9.8 2 4.6 5.2 7.8 9.8 9.8-4.6 2-7.8 5.2-9.8 9.8-2-4.6-5.2-7.8-9.8-9.8z"></path></svg> <strong>Artesanal:</strong> Preparado el mismo día de la entrega.</p>
          </div>
        </div>

        <!-- Product Info -->
        <div class="product-info">
          <nav class="breadcrumb" *ngIf="showBreadcrumb">
            <a routerLink="/productos">Productos</a> / <span>{{ product.category }}</span>
          </nav>
          
          <h1 class="title-font product-title">{{ product.name }}</h1>
          <div class="product-price">{{ getPriceStr() }}</div>
          
          <div class="divider"></div>
          
          <div class="product-description-wrap">
             <h3>Qué incluye esta cesta:</h3>
             <p class="description-text">{{ product.description }}</p>
          </div>

          <div class="purchase-actions" *ngIf="showActions">
            <div class="quantity-selector">
              <button (click)="updateQty(-1)">-</button>
              <span>{{ quantity }}</span>
              <button (click)="updateQty(1)">+</button>
            </div>
            <button class="btn btn-primary btn-lg add-to-cart" (click)="onAddToCart.emit(quantity)">
              Añadir al Carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .detail-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 4rem;
      align-items: start;
    }
    .main-image-wrap {
      border-radius: var(--radius-lg);
      overflow: hidden;
      background: #fdfdfd;
      border: 1px solid #eee;
    }
    .main-image-wrap img {
      width: 100%;
      height: auto;
      display: block;
    }
    .product-info {
      display: flex;
      flex-direction: column;
    }
    .breadcrumb {
      font-size: 0.9rem;
      margin-bottom: 1rem;
      color: var(--text-muted);
    }
    .product-title {
      font-size: 3rem;
      color: var(--primary);
      margin-bottom: 1rem;
    }
    .product-price {
      font-size: 2rem;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 1.5rem;
    }
    .divider {
      width: 100%;
      height: 1px;
      background: #eee;
      margin: 2rem 0;
    }
    .description-text {
      font-size: 1.1rem;
      line-height: 1.8;
      color: #555;
    }
    .purchase-actions {
      display: flex;
      gap: 1.5rem;
      margin-top: 3rem;
      align-items: center;
    }
    .quantity-selector {
       display: flex;
       align-items: center;
       border: 1px solid #ddd;
       border-radius: 8px;
       overflow: hidden;
    }
    .quantity-selector button {
       padding: 0.8rem 1.2rem;
       background: #f9f9f9;
       border: none;
       cursor: pointer;
       font-weight: bold;
    }
    .quantity-selector span {
       padding: 0 1.5rem;
       font-weight: 600;
       color: #333;
    }
    .add-to-cart {
      flex: 1;
      padding: 1rem;
    }
    .delivery-info {
       margin-top: 1.5rem;
       background: #fdfdfd;
       padding: 1.2rem;
       border-radius: 12px;
       font-size: 0.95rem;
       color: #666;
       border: 1px solid rgba(139, 69, 19, 0.05);
    }
    .delivery-info p { margin-bottom: 0.8rem; }
    .delivery-info p:last-child { margin-bottom: 0; }
    .delivery-info svg { color: var(--secondary); margin-right: 0.5rem; }

    @media (max-width: 992px) {
      .detail-grid { grid-template-columns: 1fr; gap: 2.5rem; }
      .product-title { font-size: 2.2rem; }
    }

    @media (max-width: 768px) {
      .product-title {
        font-size: 1.8rem;
      }
      .product-price {
        font-size: 1.6rem;
        margin-bottom: 1rem;
      }
      .purchase-actions {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
        margin-top: 2rem;
      }
      .quantity-selector {
        justify-content: center;
      }
      .divider {
        margin: 1.5rem 0;
      }
      .delivery-info {
        margin-top: 2rem;
        padding: 1.2rem;
      }
    }
  `]
})
export class ProductDetailViewComponent {
  @Input() product: Partial<ResourceMap> | null = null;
  @Input() showActions = true;
  @Input() showBreadcrumb = true;
  @Output() onAddToCart = new EventEmitter<number>();

  quantity = 1;

  getPriceStr() {
    if (this.product?.priceStr) return this.product.priceStr;
    if (this.product?.price) {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(this.product.price);
    }
    return '';
  }

  updateQty(val: number) {
    this.quantity = Math.max(1, this.quantity + val);
  }

  onImgError(event: any) {
    event.target.src = 'assets/images/placeholder.jpg';
  }
}
