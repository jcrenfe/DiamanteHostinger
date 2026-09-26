import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { CartStore } from '../../store/cart.store';
import { ImageUrlPipe } from '../../pipes/image-url.pipe';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, RouterModule, ImageUrlPipe],
  template: `
    <!-- Overlay -->
    <div class="cart-overlay" *ngIf="cart.isOpen()" (click)="cart.closeCart()"></div>

    <!-- Drawer -->
    <aside class="cart-drawer" [class.open]="cart.isOpen()">
      <div class="cart-header">
        <h2 class="title-font">Tu Pedido</h2>
        <button class="close-btn" (click)="cart.closeCart()">&times;</button>
      </div>

      <div class="cart-content">
        <div *ngIf="cart.items().length === 0" class="empty-cart fade-in">
          <div class="empty-icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg></div>
          <p>Tu cesta está vacía</p>
          <button class="btn btn-primary" (click)="cart.closeCart()">Seguir comprando</button>
        </div>

        <ul class="cart-items" *ngIf="cart.items().length > 0">
          <li *ngFor="let item of cart.items()" class="cart-item fade-in">
            <div class="item-img">
              <img [src]="item.product.local_image_path | imageUrl" 
                   [alt]="item.product.name"
                   (error)="onImgError($event)">
            </div>
            <div class="item-details">
              <h4>{{ item.product.name }}</h4>
              <p class="item-price">{{ item.product.priceStr }}</p>
              <div class="item-actions">
                <div class="qty-control">
                  <button (click)="cart.updateQuantity(item.product.id, item.quantity - 1)">-</button>
                  <span>{{ item.quantity }}</span>
                  <button (click)="cart.updateQuantity(item.product.id, item.quantity + 1)">+</button>
                </div>
                <button class="remove-btn" (click)="cart.removeItem(item.product.id)">Eliminar</button>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <div class="cart-footer" *ngIf="cart.items().length > 0">
        <div class="cart-summary">
          <div class="summary-line">
            <span>Subtotal</span>
            <span>{{ cart.totalPrice() | number:'1.2-2' }}€</span>
          </div>
          <div class="summary-line total">
            <span>Total estim.</span>
            <span>{{ cart.totalPrice() | number:'1.2-2' }}€</span>
          </div>
        </div>
        <button class="btn btn-primary btn-block checkout-btn" (click)="goToCheckout()">
          Tramitar Pedido
        </button>
        <p class="footer-note">Garantía de frescura absoluta <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.2 12c4.6-2 7.8-5.2 9.8-9.8 2 4.6 5.2 7.8 9.8 9.8-4.6 2-7.8 5.2-9.8 9.8-2-4.6-5.2-7.8-9.8-9.8z"></path></svg></p>
      </div>
    </aside>
  `,
  styles: [`
    .cart-overlay {
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
      z-index: 2000;
    }
    .cart-drawer {
      position: fixed;
      top: 0; right: -450px;
      width: 100%;
      max-width: 400px;
      height: 100vh;
      background: white;
      z-index: 2001;
      display: flex;
      flex-direction: column;
      box-shadow: -10px 0 30px rgba(0,0,0,0.1);
      transition: right 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
    }
    .cart-drawer.open {
      right: 0;
    }
    .cart-header {
      padding: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #eee;
    }
    .cart-header h2 { margin: 0; color: var(--primary); }
    .close-btn {
      background: none; border: none; font-size: 2.5rem;
      cursor: pointer; color: var(--text-muted);
      line-height:1;
    }
    .cart-content {
      flex: 1;
      overflow-y: auto;
      padding: 2rem;
    }
    .empty-cart {
      text-align: center;
      margin-top: 4rem;
    }
    .empty-icon { font-size: 4rem; margin-bottom: 1rem; }
    .cart-items { list-style: none; padding: 0; margin: 0; }
    .cart-item {
      display: flex;
      gap: 1.5rem;
      margin-bottom: 2rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid #f9f9f9;
    }
    .item-img {
      width: 80px; height: 80px;
      border-radius: 8px; overflow: hidden;
      flex-shrink: 0;
    }
    .item-img img { width: 100%; height: 100%; object-fit: cover; }
    .item-details h4 { margin: 0 0 0.5rem 0; color: var(--primary); font-size: 1rem; }
    .item-price { font-weight: 700; color: var(--accent); margin-bottom: 1rem; }
    .item-actions { display: flex; align-items: center; gap: 1.5rem; }
    .qty-control {
      display: flex; align-items: center;
      border: 1px solid #ddd; border-radius: 6px;
    }
    .qty-control button {
      background: none; border: none; padding: 0.3rem 0.6rem;
      cursor: pointer; font-weight: bold;
    }
    .qty-control span { font-weight: 600; padding: 0 0.5rem; font-size: 0.9rem; }
    .remove-btn {
      background: none; border: none; color: #ff5252;
      font-size: 0.85rem; font-weight: 600; cursor: pointer;
      text-decoration: underline;
    }
    .cart-footer {
      padding: 2rem;
      background: #fdfaf7;
      border-top: 1px solid #eee;
    }
    .cart-summary { margin-bottom: 2rem; }
    .summary-line {
      display: flex; justify-content: space-between;
      margin-bottom: 0.8rem; font-size: 0.95rem;
    }
    .summary-line total {
       font-weight: 800; font-size: 1.2rem;
       color: var(--primary); margin-top: 1rem;
       padding-top: 1rem; border-top: 1px solid #ddd;
    }
    .checkout-btn { width: 100%; padding: 1.2rem; font-size: 1.1rem; }
    .footer-note {
      text-align: center; font-size: 0.8rem; margin-top: 1.5rem;
      color: var(--text-muted);
    }
  `]
})
export class CartDrawerComponent {
  cart = inject(CartStore);
  private router = inject(Router);

  onImgError(event: any) {
    event.target.src = 'assets/images/placeholder.webp';
  }

  goToCheckout() {
    this.cart.closeCart();
    this.router.navigate(['/checkout']);
  }
}
